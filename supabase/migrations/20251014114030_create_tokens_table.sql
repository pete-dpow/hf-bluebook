/*
  # Create tokens table for tracking user credits

  1. New Tables
    - `tokens`
      - `session_id` (text, primary key) - Stripe session ID stored in cookie
      - `tokens_remaining` (integer, default 100) - Number of AI summary tokens available
      - `created_at` (timestamptz, default now()) - When the session was created
      - `updated_at` (timestamptz, default now()) - Last time tokens were used

  2. Security
    - Enable RLS on `tokens` table
    - Add policy for service role only (backend API access)
    
  3. Notes
    - No user authentication required
    - Session ID comes from Stripe Checkout
    - Each successful payment creates a new session with 100 tokens
*/

CREATE TABLE IF NOT EXISTS tokens (
  session_id text PRIMARY KEY,
  tokens_remaining integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all tokens"
  ON tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);