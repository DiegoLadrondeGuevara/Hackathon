import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")

def lambda_handler(event, context):
    logger.info("=== WebSocket $disconnect ===")

    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=f"https://{domain}/{stage}"
    )

    try:
        item = connections_table.get_item(Key={"connectionId": connection_id}).get("Item")
        username = item["username"] if item else "Anon"

        connections_table.delete_item(Key={"connectionId": connection_id})

        # Obtener conexiones restantes
        result = connections_table.scan()
        connections = result.get("Items", [])

        # Mensaje para enviar
        notification = {
            "type": "notification",
            "message": f"{username} se ha desconectado"
        }
        user_list = {
            "type": "userList",
            "users": [c["username"] for c in connections]
        }

        for conn in connections:
            try:
                cid = conn["connectionId"]
                api.post_to_connection(ConnectionId=cid, Data=json.dumps(notification).encode())
                api.post_to_connection(ConnectionId=cid, Data=json.dumps(user_list).encode())
            except:
                connections_table.delete_item(Key={"connectionId": cid})

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"ERROR disconnect: {str(e)}")
        return {"statusCode": 500}
