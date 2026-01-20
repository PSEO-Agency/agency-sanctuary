-- Allow all authenticated users to read platform settings (non-sensitive configuration flags)
CREATE POLICY "Authenticated users can read platform settings"
ON platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Allow users to create a subscription for their own subaccount
CREATE POLICY "Users can create their subaccount subscription"
ON subaccount_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));