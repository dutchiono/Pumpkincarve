'use client';

import { useState, useEffect } from 'react';

interface DaimoPayModalProps {
  amount: number; // Amount in USD
  recipient: string; // Recipient address or ENS name
  onPaymentComplete: (txHash: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

/**
 * Daimo Pay Payment Modal Component
 *
 * This component integrates with Daimo Pay SDK to provide multi-currency payment options
 * (ETH, USDC on Base, etc.) with balance display and wallet connection.
 *
 * TODO: Integrate with Daimo Pay SDK once installed
 * Documentation: https://paydocs.daimo.com/
 * Integration Guide: https://paydocs.daimo.com/integration-guides/farcaster-mini-apps
 *
 * Current implementation is a placeholder that will be replaced with actual Daimo Pay integration.
 */
export default function DaimoPayModal({
  amount,
  recipient,
  onPaymentComplete,
  onCancel,
  isOpen,
}: DaimoPayModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<'ETH' | 'USDC'>('USDC');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [ethAmount, setEthAmount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // TODO: Fetch balances using Daimo Pay SDK or wallet hooks
      // TODO: Calculate ETH equivalent for USD amount using price oracle
      // For now, using approximate conversion
      const approximateEthAmount = (amount / 3300).toFixed(6); // ~$3300/ETH
      setEthAmount(approximateEthAmount);
    }
  }, [isOpen, amount]);

  if (!isOpen) return null;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with Daimo Pay SDK
      // const payment = await daimoPay.createPayment({
      //   amount: selectedCurrency === 'ETH' ? ethAmount : amount.toString(),
      //   currency: selectedCurrency,
      //   recipient,
      //   chainId: 8453, // Base Mainnet
      // });
      //
      // const txHash = await payment.send();
      // onPaymentComplete(txHash);

      // Placeholder: Simulate payment
      alert(`Daimo Pay integration needed. Would pay $${amount} ${selectedCurrency === 'ETH' ? 'in ETH' : 'USDC'} to ${recipient}`);
      onCancel();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-t-xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <h2 className="text-xl font-bold text-white">Pay</h2>
          <button
            onClick={onCancel}
            className="text-white hover:text-gray-400 text-xl"
          >
            ×
          </button>
        </div>

        {/* Payment Details */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-bold text-white">${amount.toFixed(2)}</span>
            <div className="text-right">
              <span className="text-white">{recipient}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-3 mb-4">
            {/* ETH Option */}
            <button
              onClick={() => setSelectedCurrency('ETH')}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${
                selectedCurrency === 'ETH'
                  ? 'border-cyan-500 bg-slate-700'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-white font-medium">{ethAmount} ETH on Base</p>
                  <p className="text-gray-400 text-sm">Balance: {ethBalance} ETH</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-white text-xs">ETH</span>
                </div>
              </div>
            </button>

            {/* USDC Option */}
            <button
              onClick={() => setSelectedCurrency('USDC')}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${
                selectedCurrency === 'USDC'
                  ? 'border-cyan-500 bg-slate-700'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-white font-medium">{amount} USDC on Base</p>
                  <p className="text-gray-400 text-sm">Balance: {usdcBalance} USDC</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-white text-xs">USDC</span>
                </div>
              </div>
            </button>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : `Pay with ${selectedCurrency}`}
          </button>

          {/* Note */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Daimo Pay integration coming soon. This is a placeholder UI.
          </p>
        </div>
      </div>
    </div>
  );
}

