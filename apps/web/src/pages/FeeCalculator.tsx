import { useState } from "react";
import { api, type FeeResult } from "../api";

type Country = "US" | "UK" | "CA" | "DE" | "OTHER";

export default function FeeCalculator() {
  const [itemPrice, setItemPrice] = useState("10");
  const [shipping, setShipping] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [country, setCountry] = useState<Country>("US");
  const [offsiteAds, setOffsiteAds] = useState(false);
  const [annualSales, setAnnualSales] = useState("0");
  const [result, setResult] = useState<FeeResult | null>(null);
  const [error, setError] = useState("");

  const calc = async () => {
    setError("");
    try {
      setResult(
        await api.feeCalculator({
          itemPrice: Number(itemPrice),
          shippingCharged: Number(shipping),
          quantity: Math.max(1, Math.round(Number(quantity))),
          country,
          offsiteAds,
          annualSalesUsd: Number(annualSales),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "calculation failed");
    }
  };

  return (
    <div>
      <h1 className="page-title">Fee Calculator</h1>
      <p className="page-sub">
        Etsy's fees on a sale — computed locally, no API needed. Figures are approximate;
        re-verify against Etsy's current fee schedule before relying on them.
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>Sale details</h3>
          <div className="field">
            <label>Item price (USD)</label>
            <input className="input" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>Shipping charged (USD)</label>
            <input className="input" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </div>
          <div className="field">
            <label>Quantity</label>
            <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="field">
            <label>Seller country</label>
            <select
              className="select"
              value={country}
              onChange={(e) => setCountry(e.target.value as Country)}
            >
              <option value="US">US</option>
              <option value="UK">UK</option>
              <option value="CA">CA</option>
              <option value="DE">DE</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Annual Etsy sales (USD)</label>
            <input
              className="input"
              value={annualSales}
              onChange={(e) => setAnnualSales(e.target.value)}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={offsiteAds}
                onChange={(e) => setOffsiteAds(e.target.checked)}
              />{" "}
              Sold via Offsite Ads
            </label>
          </div>
          <button className="btn" onClick={() => void calc()}>
            Calculate
          </button>
        </div>

        <div className="card">
          <h3>Breakdown</h3>
          {error && <div className="error">{error}</div>}
          {result ? (
            <table className="table">
              <tbody>
                <tr>
                  <td>Listing fee</td>
                  <td>${result.listingFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Transaction fee (6.5%)</td>
                  <td>${result.transactionFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Payment processing</td>
                  <td>${result.paymentProcessingFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Offsite ads fee</td>
                  <td>${result.offsiteAdsFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total fees</strong>
                  </td>
                  <td>
                    <strong>${result.totalFees.toFixed(2)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>You keep</strong>
                  </td>
                  <td>
                    <strong>${result.netProfit.toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="empty">Enter sale details and hit Calculate.</div>
          )}
        </div>
      </div>
    </div>
  );
}
