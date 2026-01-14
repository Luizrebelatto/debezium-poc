# Debezium CDC POC

POC Change Data Capture (CDC) using Debezium, PostgreSQL, Kafka e Bun.

## Components

- **PostgreSQL 15**: Database with logical replication enabled
- **Kafka + Zookeeper**: Message broker for streaming events
- **Debezium Connect**: Captures database changes and publishes them to Kafka
- **Kafka UI**: Web interface for viewing topics and messages
- **Bun Consumer**: Application that consumes and processes CDC events

## How to run

### Start infra

```bash
docker-compose up -d
```

### Install dependencies

```bash
bun install
```

### Iniciar o consumer

```bash
bun start
```
## URLs

| Serviço | URL |
|---------|-----|
| Kafka UI | http://localhost:8080 |
| Debezium Connect API | http://localhost:8083 |
| PostgreSQL | localhost:5434 |
| Kafka | localhost:29092 |

## Verify Status

```bash
curl http://localhost:8083/connectors | jq .

curl http://localhost:8083/connectors/postgres-connector/status | jq .

docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

## Project structure

```
.
├── docker-compose.yml
├── init.sql                
├── connector-config.json   
├── package.json            
├── scripts/
│   └── setup-connector.sh  
└── src/
    ├── consumer.ts         
    └── api.ts 
```

## Message formats CDC

```json
{
  "payload": {
    "before": { ... },
    "after": { ... },
    "source": {
      "table": "users",
      "db": "app",
      ...
    },
    "op": "create",
    "ts_ms": 1234567890
  }
}
```

## Stop Services

```bash
docker-compose down

docker-compose down -v
```
