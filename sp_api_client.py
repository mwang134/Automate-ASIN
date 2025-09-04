import os, time, random
from dotenv import load_dotenv, find_dotenv
from sp_api.api import Orders
from sp_api.base import Marketplaces, SellingApiException

#server sees the right .env
# from pathlib import Path
# from dotenv import load_dotenv
# load_dotenv(Path(__file__).resolve().parent / ".env", override=True)  # backend/.env


load_dotenv(find_dotenv(), override=True)  # take environment variables


MarketP_MAP = {
    'US': Marketplaces.US, 'CA': Marketplaces.CA, 'MX': Marketplaces.MX
}

RATE_DELAY = float(os.getenv('SP_API_RATE_DELAY_SEC', '1.2'))   # throttle spacing
MAX_RETRIES = int(os.getenv('SP_API_MAX_RETRIES', '4'))         # retry attempts

# centralize all client secrets
def order_client():
    
    mp = MarketP_MAP.get(os.getenv('SP_API_REGION', 'US').upper(), Marketplaces.US)
    creds = { 
        "refresh_token": os.getenv('LWA_REFRESH_TOKEN'),
        "lwa_app_id": os.getenv('LWA_CLIENT_ID'),
        "lwa_client_secret": os.getenv('LWA_CLIENT_SECRET')
    }
    
    missing = [k for k,v in creds.items() if not v]
    if missing:

        raise RuntimeError(f"Missing env for: {', '.join(missing)}")
    
    return Orders(marketplace=mp, credentials=creds)

# retry/throttle
def call_with_retries(fn, *args, **kwargs):

    attempt = 0

    while True:

        try:

            res = fn(*args, **kwargs)
            time.sleep(RATE_DELAY)  # respect Rate/Burst

            return res, None
        
        except SellingApiException as e:
            status = getattr(e, 'status_code', None) or getattr(getattr(e, 'response', None), 'status_code', None) or 0
            code_str = str(getattr(e, 'code', '') or '').lower()  
            msg = getattr(e, 'message', None) or getattr(e, 'errors', None) or str(getattr(getattr(e, 'response', None), 'text', '') or '') or str(e)

            retriable = (status in (429, 500, 502, 503, 504) or 'throttle' in code_str or 'quota' in code_str or 'timeout' in code_str or 'temporarily' in code_str)

            if retriable and attempt < MAX_RETRIES:
                backoff = (RATE_DELAY * pow(2, attempt)) + random.uniform(0, 0.4)
                time.sleep(backoff); 
                attempt += 1; 
                continue

            return None, f"{status} {code_str}: {msg}"

        # except SellingApiException as e:

        #     # rety logic
        #     status = getattr(e, 'status_code', 0) or getattr(getattr(e, 'response', None), 'status_code', 0)
        #     code = (getattr(e, 'code', '') or '').lower()
        #     retriable = status in (429, 500, 502, 503, 504) or 'throttle' in code or 'quota' in code

        #     if retriable and attempt < MAX_RETRIES:


        #         backoff = (RATE_DELAY * pow(2, attempt)) + random.uniform(0, 0.4)
        #         time.sleep(backoff)
        #         attempt += 1
        #         continue
        #     return None, str(e)

#  return list from amazon getOrderID
def layout_order_items(payload: dict):

    order_items = (payload or {}).get('OrderItems') or []
    result = []

    for item in order_items:

        result.append({
            "asin":  item.get("ASIN", ""),
        })

    return result


# combine multiple line items into single cell sheet
def join_for_sheet(items: list[dict]) -> dict:

    return {
        "asins":  ",".join(i["asin"]  for i in items),
    }

# calls getOrderItems 
def fetch_order_items(order_id: str):

    # tuple
    res, err = call_with_retries(order_client().get_order_items, order_id)

    if err:

        return [], err
    payload = getattr(res, 'payload', {}) or {}

    return layout_order_items(payload), None

def have_order_items(order_id: str):

    return fetch_order_items(order_id)