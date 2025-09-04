import os
from flask import Flask, request, jsonify
from sp_api_client import have_order_items, join_for_sheet
BACKEND_API_KEY = os.getenv('BACKEND_API_KEY', '')

app = Flask(__name__) 

@app.get("/env-check")
def env_check():
    import os
    g = lambda k: len(os.getenv(k) or "")
    return {
        "LWA_CLIENT_ID_len": g("LWA_CLIENT_ID"),
        "LWA_CLIENT_SECRET_len": g("LWA_CLIENT_SECRET"),
        "LWA_REFRESH_TOKEN_len": g("LWA_REFRESH_TOKEN"),
    }

@app.errorhandler(400)
def bad_request(e):

    return {"error": "bad_request", "hint": str(e)}, 400

@app.get("/health")
def health():

    return {"ok": True}, 200

@app.post("/fill-asins")
def fill_asins():
    body = request.get_json(silent=True) or {} # don't throw 400 automatically
    if not isinstance(body, dict) or "orderIds" not in body:
        return {"error": "invalid_json", "hint": "expected { orderIds: [...] }"}, 400
    order_ids = list(dict.fromkeys(body.get("orderIds") or []))
    if not order_ids:
        return {"error": "empty_selection"}, 400
    
    results = [] 
    alreadySeen = {}     # timed      

    for orderId in order_ids:

        if orderId not in alreadySeen:

            alreadySeen[orderId] = have_order_items(orderId)
        items, err = alreadySeen[orderId]

        if err:

            results.append({
                "orderId": orderId, "status": "ERROR",
                "asins": "", 
                "error": err
            })
        else:

            results.append({
                "orderId": orderId, 
                "status": "OK", 
                "error": "", 
                **join_for_sheet(items) # standardized sheet shape
            })

        

    return jsonify({"results": results})          

if __name__ == "__main__":
    
    app.run(host="127.0.0.1", port=8080, debug=True)
