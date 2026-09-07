-- ============================================================================
-- NLAMS DATABASE MIGRATION 007: INTELLIGENT ALERTS & NOTIFICATIONS FOUNDATION
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 007: Notifications & Intelligent Alerts schema, idempotency & RLS
-- ============================================================================

-- 1. NOTIFICATIONS TABLE (IN-APP USER NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')),
    link_url TEXT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Notification Retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);


-- 2. ALERTS TABLE (INTELLIGENT SYSTEMIC ALERTS)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'DISMISSED')),
    target_role TEXT NULL,
    assigned_officer_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL
);

-- Partial Unique Index for Alert Deduplication (Idempotency)
-- Guarantees at most ONE active alert per alert_key while allowing historical RESOLVED / DISMISSED records
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_active_key 
ON public.alerts(alert_key) 
WHERE status = 'ACTIVE';

-- Indexes for Fast Alert Queries
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_officer ON public.alerts(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);


-- 3. SECURITY DEFINER USER ROLE HELPER FUNCTION
-- Safely resolves authenticated user's role from profiles without circular RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = TRUE;
    
    RETURN user_role;
END;
$$;


-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;


-- 5. ROW LEVEL SECURITY POLICIES FOR NOTIFICATIONS
-- Users can view ONLY their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    public.is_active_user() AND user_id = auth.uid()
);

-- Users can update ONLY their own notifications (e.g., marking as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    public.is_active_user() AND user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- Direct browser INSERT and DELETE on notifications are DENIED by default (no policies created).
-- Notifications will be populated via service-role / authenticated API backend endpoints.


-- 6. ROW LEVEL SECURITY POLICIES FOR ALERTS
-- Active authenticated users can view alerts relevant to their role/assignment or macro-level view
DROP POLICY IF EXISTS "Active users can view relevant alerts" ON public.alerts;
CREATE POLICY "Active users can view relevant alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
    public.is_active_user() AND (
        assigned_officer_id = auth.uid()
        OR (target_role IS NOT NULL AND target_role = public.get_user_role())
        OR public.get_user_role() IN ('Admin', 'MoRTH Nodal Officer')
    )
);

-- Direct browser INSERT, UPDATE, DELETE on alerts are DENIED by default (no write policies created).
-- Alerts will be created, resolved, or dismissed via server-side alert engine endpoints with RBAC enforcement.
