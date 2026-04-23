# DataGuard Infrastructure

## Stack

| Layer | Service | Notes |
|-------|---------|-------|
| Compute | ECS Fargate / Docker Compose | Workers auto-scale on queue depth |
| Database | RDS PostgreSQL 16 | Multi-AZ, encrypted at rest (KMS) |
| Cache / Queue | ElastiCache Redis | BullMQ / Celery broker + result backend |
| Storage | S3 + KMS | Encrypted artefacts, reports, bloom filters |
| Email | AWS SES | Transactional mail + DSAR letters |
| Inbound | SES → S3 → Lambda | Honey-token catch-all |
| CDN | CloudFront | Frontend assets |
| Monitoring | Prometheus + Flower | Worker queue visibility |

## Deploy

```bash
# 1. Copy and edit variables
cp terraform.tfvars.example terraform.tfvars

# 2. Init and apply
cd infrastructure/aws
terraform init
terraform apply

# 3. Run migrations
cd backend
SYNC_DATABASE_URL=<rds-endpoint> alembic upgrade head

# 4. Build and push Docker images
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml push

# 5. Update ECS task definitions
aws ecs update-service --cluster dataguard --service backend --force-new-deployment
```

## Honey-Token Architecture

1. Each scan seeds `n` unique email aliases at `honey.dataguard.example.com`
2. Aliases are stored in Postgres (`honey_tokens` table) with their scan ID
3. Mailgun or SES catch-all receives any inbound mail to `*@honey.dataguard.example.com`
4. Webhook or Lambda fires → POST `/api/v1/webhooks/mailgun/inbound`
5. Backend matches alias → creates `honey_token_hits` record → user alerted

## BrokerProbe Pipeline

```
PII Vault ──► Synthetic Identity Seeder ──► Outbound DSAR Engine ──► Broker APIs/Forms
                                                                          │
                                              Data Lake (S3 raw responses) ◄──┘
                                                    │
                          ┌─────────────────────────┼────────────────────────┐
                          ▼                         ▼                        ▼
                 Honey-Token Hit Detector  Breach Corpus Comparator  Model-Fingerprint Auditor
                          │                         │                        │
                          └─────────────────────────┼────────────────────────┘
                                                    ▼
                                       Compliance Scoring Engine
                                                    │
                                                    ▼
                                       Regulator/Legal Packager (PDF + SHA-256)
```
