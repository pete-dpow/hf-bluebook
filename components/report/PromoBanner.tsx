import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PromoBanner() {
  const handlePromoClick = () => {
    // Dispatch custom event that can be listened to by parent page
    window.dispatchEvent(new CustomEvent('navigateToPricing'));
  };

  return (
    <Card 
      className="mb-8 overflow-hidden relative transition-all duration-200 hover:shadow-lg"
      style={{
        background: '#111827',
        border: '1px solid #1F2937'
      }}
    >
      {/* Decorative Gradient Circles */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-30">
        <div 
          className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, #F97316 0%, transparent 70%)'
          }}
        />
        <div 
          className="absolute top-12 right-12 w-32 h-32 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, #FB923C 0%, transparent 70%)'
          }}
        />
      </div>

      <CardContent className="relative z-10 p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">
              Switch to dpow Pro today!
            </h3>
            <p className="text-gray-300 text-sm max-w-xl">
              Unlock unlimited reports, custom branding, advanced analytics, and priority support. 
              Upgrade your construction management workflow.
            </p>
          </div>
          <Button 
            onClick={handlePromoClick}
            className="ml-6 px-8 py-6 text-base font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'white',
              color: '#111827',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}
          >
            Try Now!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
