import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")
incidents_table = dynamodb.Table("Incidents")

def lambda_handler(event, context):
    logger.info("=== WebSocket $connect ===")

    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=f"https://{domain}/{stage}"
    )

    try:
        connections_table.put_item(Item={
            "connectionId": connection_id,
            "username": "Anon"
        })

        # Enviar incidentes actuales
        response = incidents_table.scan()
        incidents = json.loads(json.dumps(response.get("Items", []), default=str))

        api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps({
                "type": "incidentsList",
                "incidents": incidents
            }).encode("utf-8")
        )

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"ERROR en connect: {str(e)}")
        return {"statusCode": 500}
