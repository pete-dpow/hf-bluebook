export interface WhatsAppMessageResult {
  status: 'ok' | 'error';
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppMessageResult> {
  try {

    if (!to.startsWith('+')) {
      return {
        status: 'error',
        error: 'Phone number must include country code (e.g., +1234567890)'
      };
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      return {
        status: 'ok',
        messageId: `sim-msg-${Date.now()}`
      };
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioWhatsAppNumber}`,
          To: `whatsapp:${to}`,
          Body: body
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        status: 'error',
        error: `Failed to send message: ${error}`
      };
    }

    const data = await response.json();

    return {
      status: 'ok',
      messageId: data.sid
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendTeamsMessage(
  webhookUrl: string,
  message: string,
  title?: string
): Promise<WhatsAppMessageResult> {
  try {

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '2563EB',
        title: title || 'hf.bluebook Update',
        text: message
      })
    });

    if (!response.ok) {
      return {
        status: 'error',
        error: 'Failed to send Teams message'
      };
    }

    return {
      status: 'ok',
      messageId: `teams-msg-${Date.now()}`
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
