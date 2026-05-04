
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

// Store for cryptocurrency prices and user alerts
const cryptoPrices = {
  BTC: 45250.5,
  ETH: 2340.75,
  BNB: 315.2,
  XRP: 2.15,
  ADA: 0.95,
};

const userAlerts = {};

const tools = [
  {
    name: "get_crypto_prices",
    description:
      "Get the current prices of cryptocurrencies in USD. Can get prices for specific cryptocurrencies or all available ones.",
    input_schema: {
      type: "object",
      properties: {
        cryptocurrencies: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "List of cryptocurrency symbols (e.g., BTC, ETH, BNB). If empty, returns all available prices.",
        },
      },
      required: ["cryptocurrencies"],
    },
  },
  {
    name: "set_price_alert",
    description:
      "Set an alert for when a cryptocurrency reaches a specific price. Supports both 'above' and 'below' conditions.",
    input_schema: {
      type: "object",
      properties: {
        cryptocurrency: {
          type: "string",
          description:
            "The cryptocurrency symbol (e.g., BTC, ETH). Must be in uppercase.",
        },
        price_threshold: {
          type: "number",
          description: "The price threshold for the alert in USD.",
        },
        condition: {
          type: "string",
          enum: ["above", "below"],
          description:
            "Whether to alert when price goes above or below the threshold.",
        },
      },
      required: ["cryptocurrency", "price_threshold", "condition"],
    },
  },
  {
    name: "check_alerts",
    description:
      "Check if any active alerts have been triggered based on current prices.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_alerts",
    description: "List all active price alerts for the user.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_prices",
    description:
      "Simulate price updates for cryptocurrencies. Use this to test alert triggers.",
    input_schema: {
      type: "object",
      properties: {
        price_updates: {
          type: "object",
          additionalProperties: {
            type: "number",
          },
          description:
            "An object with cryptocurrency symbols as keys and new prices as values.",
        },
      },
      required: ["price_updates"],
    },
  },
  {
    name: "delete_alert",
    description: "Delete a specific price alert.",
    input_schema: {
      type: "object",
      properties: {
        alert_id: {
          type: "string",
          description: "The ID of the alert to delete.",
        },
      },
      required: ["alert_id"],
    },
  },
];

function getCryptoPrices(cryptocurrencies) {
  if (cryptocurrencies.length === 0) {
    return Object.entries(cryptoPrices).map(([symbol, price]) => ({
      symbol,
      price,
      timestamp: new Date().toISOString(),
    }));
  }

  return cryptocurrencies
    .map((symbol) => {
      const upperSymbol = symbol.toUpperCase();
      if (cryptoPrices[upperSymbol] !== undefined) {
        return {
          symbol: upperSymbol,
          price: cryptoPrices[upperSymbol],
          timestamp: new Date().toISOString(),
        };
      }
      return null;
    })
    .filter((price) => price !== null);
}

function setPriceAlert(cryptocurrency, priceThreshold, condition) {
  const upperSymbol = cryptocurrency.toUpperCase();

  if (!cryptoPrices[upperSymbol]) {
    return {
      success: false,
      message: `Unknown cryptocurrency: ${upperSymbol}. Available: ${Object.keys(cryptoPrices).join(", ")}`,
    };
  }

  if (!userAlerts[upperSymbol]) {
    userAlerts[upperSymbol] = [];
  }

  const alertId = `${upperSymbol}_${Date.now()}`;
  const alert = {
    id: alertId,
    cryptocurrency: upperSymbol,
    price_threshold: priceThreshold,
    condition,
    created_at: new Date().toISOString(),
    triggered: false,
  };

  userAlerts[upperSymbol].push(alert);

  return {
    success: true,
    message: `Alert set: ${upperSymbol} will alert when price goes ${condition} $${priceThreshold}`,
    alert_id: alertId,
  };
}

function checkAlerts() {
  const triggeredAlerts = [];

  for (const [symbol, alerts] of Object.entries(userAlerts)) {
    const currentPrice = cryptoPrices[symbol];
    if (!currentPrice) continue;

    alerts.forEach((alert) => {
      if (alert.triggered) return;

      let shouldTrigger = false;
      if (alert.condition === "above" && currentPrice > alert.price_threshold) {
        shouldTrigger = true;
      } else if (
        alert.condition === "below" &&
        currentPrice < alert.price_threshold
      ) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        alert.triggered = true;
        triggeredAlerts.push({
          alert_id: alert.id,
          cryptocurrency: symbol,
          current_price: currentPrice,
          threshold: alert.price_threshold,
          condition: alert.condition,
          message: `ALERT: ${