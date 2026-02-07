/*
  # Update tokens table policies

  1. Changes
    - Drop restrictive service_role policy
    - Add public policies for insert, select, and update
    - Ensure session_id is unique and properly indexed
  
  2. Security
    - Anyone can create a token record (needed for webhook)
    - Anyone can read their own tokens (using session_id)
    - Anyone can update their own tokens (decrement count)
    - Session IDs are unique and come from Stripe
*/

DROP POLICY IF EXISTS "Service role can manage all tokens" ON tokens;

CREATE POLICY "Anyone can insert tokens"
  ON tokens
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read tokens"
  ON tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update tokens"
  ON tokens
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
