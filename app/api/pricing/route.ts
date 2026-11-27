import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rzcizwacjexolkjjczbt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();

    let user: any = null;
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      user = data.user;
    }

    const now = new Date();
    const basePrice = 399;

    // 1. If user is logged in, check for active custom sale
    if (user) {
      // Check app_metadata
      const appMetaSale = user.app_metadata?.custom_sale;
      if (
        appMetaSale &&
        appMetaSale.is_active !== false &&
        new Date(appMetaSale.expires_at) > now &&
        Number(appMetaSale.custom_price_paise) > 0
      ) {
        const customPrice = Math.round(Number(appMetaSale.custom_price_paise) / 100);
        return NextResponse.json({
          basePrice,
          price: customPrice,
          isSaleLive: true,
          endsAt: appMetaSale.expires_at,
          saleType: 'custom',
          discountPct: customPrice < basePrice ? Math.round((1 - customPrice / basePrice) * 100) : 0,
          label: appMetaSale.reason || 'Special Personal Offer',
        });
      }

      // Check user_custom_sales table
      try {
        const { data: sales } = await supabaseAdmin
          .from('user_custom_sales')
          .select('custom_price_paise, expires_at, is_active, reason')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .gt('expires_at', now.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (sales && sales.length > 0 && sales[0].custom_price_paise) {
          const customPrice = Math.round(Number(sales[0].custom_price_paise) / 100);
          return NextResponse.json({
            basePrice,
            price: customPrice,
            isSaleLive: true,
            endsAt: sales[0].expires_at,
            saleType: 'custom',
            discountPct: customPrice < basePrice ? Math.round((1 - customPrice / basePrice) * 100) : 0,
            label: sales[0].reason || 'Special Personal Offer',
          });
        }
      } catch {
        // user_custom_sales table might not be created yet
      }

      // 2. No custom sale -> Standard ₹399 Base Price
      return NextResponse.json({
        basePrice,
        price: basePrice,
        isSaleLive: false,
        endsAt: null,
        saleType: 'none',
        discountPct: 0,
        label: 'Standard Annual Pass',
      });
    }

    // Anonymous visitor: standard ₹399 annual price
    return NextResponse.json({
      basePrice,
      price: basePrice,
      isSaleLive: false,
      endsAt: null,
      saleType: 'none',
      discountPct: 0,
      label: 'Standard Annual Pass',
    });
  } catch (err) {
    console.error('[pricing] error:', err);
    return NextResponse.json(
      {
        basePrice: 399,
        price: 399,
        isSaleLive: false,
        endsAt: null,
        saleType: 'none',
        discountPct: 0,
        label: 'Standard Annual Pass',
      },
      { status: 500 }
    );
  }
}
