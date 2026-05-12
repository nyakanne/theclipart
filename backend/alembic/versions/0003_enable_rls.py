"""enable row level security

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-12
"""
from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


OWNED_TABLES = (
    'scans',
    'breach_records',
    'broker_listings',
    'honey_tokens',
    'honey_token_hits',
    'dsar_requests',
    'compliance_results',
)


def upgrade():
    for table in OWNED_TABLES:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')

    # Supabase provides auth.uid(). Local Docker/Postgres does not, so local
    # deployments keep backend ownership checks while Supabase enforces RLS.
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regprocedure('auth.uid()') IS NULL THEN
            RAISE NOTICE 'Supabase auth.uid() not found; RLS policies skipped for local backend-only deployment.';
            RETURN;
          END IF;

          DROP POLICY IF EXISTS scans_owner_select ON scans;
          DROP POLICY IF EXISTS scans_owner_insert ON scans;
          DROP POLICY IF EXISTS scans_owner_update ON scans;
          DROP POLICY IF EXISTS scans_owner_delete ON scans;
          CREATE POLICY scans_owner_select ON scans FOR SELECT
            USING (user_id = auth.uid()::text);
          CREATE POLICY scans_owner_insert ON scans FOR INSERT
            WITH CHECK (user_id = auth.uid()::text);
          CREATE POLICY scans_owner_update ON scans FOR UPDATE
            USING (user_id = auth.uid()::text)
            WITH CHECK (user_id = auth.uid()::text);
          CREATE POLICY scans_owner_delete ON scans FOR DELETE
            USING (user_id = auth.uid()::text);

          DROP POLICY IF EXISTS breach_records_owner_all ON breach_records;
          CREATE POLICY breach_records_owner_all ON breach_records FOR ALL
            USING (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = breach_records.scan_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = breach_records.scan_id
                AND scans.user_id = auth.uid()::text
            ));

          DROP POLICY IF EXISTS broker_listings_owner_all ON broker_listings;
          CREATE POLICY broker_listings_owner_all ON broker_listings FOR ALL
            USING (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = broker_listings.scan_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = broker_listings.scan_id
                AND scans.user_id = auth.uid()::text
            ));

          DROP POLICY IF EXISTS honey_tokens_owner_all ON honey_tokens;
          CREATE POLICY honey_tokens_owner_all ON honey_tokens FOR ALL
            USING (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = honey_tokens.scan_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = honey_tokens.scan_id
                AND scans.user_id = auth.uid()::text
            ));

          DROP POLICY IF EXISTS honey_token_hits_owner_all ON honey_token_hits;
          CREATE POLICY honey_token_hits_owner_all ON honey_token_hits FOR ALL
            USING (EXISTS (
              SELECT 1
              FROM honey_tokens
              JOIN scans ON scans.id = honey_tokens.scan_id
              WHERE honey_tokens.id = honey_token_hits.token_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1
              FROM honey_tokens
              JOIN scans ON scans.id = honey_tokens.scan_id
              WHERE honey_tokens.id = honey_token_hits.token_id
                AND scans.user_id = auth.uid()::text
            ));

          DROP POLICY IF EXISTS dsar_requests_owner_all ON dsar_requests;
          CREATE POLICY dsar_requests_owner_all ON dsar_requests FOR ALL
            USING (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = dsar_requests.scan_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = dsar_requests.scan_id
                AND scans.user_id = auth.uid()::text
            ));

          DROP POLICY IF EXISTS compliance_results_owner_all ON compliance_results;
          CREATE POLICY compliance_results_owner_all ON compliance_results FOR ALL
            USING (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = compliance_results.scan_id
                AND scans.user_id = auth.uid()::text
            ))
            WITH CHECK (EXISTS (
              SELECT 1 FROM scans
              WHERE scans.id = compliance_results.scan_id
                AND scans.user_id = auth.uid()::text
            ));
        END $$;
        """
    )


def downgrade():
    op.execute(
        """
        DROP POLICY IF EXISTS scans_owner_select ON scans;
        DROP POLICY IF EXISTS scans_owner_insert ON scans;
        DROP POLICY IF EXISTS scans_owner_update ON scans;
        DROP POLICY IF EXISTS scans_owner_delete ON scans;
        DROP POLICY IF EXISTS breach_records_owner_all ON breach_records;
        DROP POLICY IF EXISTS broker_listings_owner_all ON broker_listings;
        DROP POLICY IF EXISTS honey_tokens_owner_all ON honey_tokens;
        DROP POLICY IF EXISTS honey_token_hits_owner_all ON honey_token_hits;
        DROP POLICY IF EXISTS dsar_requests_owner_all ON dsar_requests;
        DROP POLICY IF EXISTS compliance_results_owner_all ON compliance_results;
        """
    )
    for table in reversed(OWNED_TABLES):
        op.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
