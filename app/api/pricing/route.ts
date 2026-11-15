import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const basePrice = 999;

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
          discountPct: Math.round((1 - customPrice / basePrice) * 100),
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
            discountPct: Math.round((1 - customPrice / basePrice) * 100),
            label: sales[0].reason || 'Special Personal Offer',
          });
        }
      } catch {
        // user_custom_sales table might not be created yet
      }

      // 2. Check 48h welcome sale for new signups
      const signupMs = new Date(user.created_at).getTime();
      const welcomeEndMs = signupMs + 48 * 3600 * 1000; // 48 hours = 2 days
      const isWelcomeLive = now.getTime() < welcomeEndMs;

      if (isWelcomeLive) {
        return NextResponse.json({
          basePrice,
          price: 399,
          isSaleLive: true,
          endsAt: new Date(welcomeEndMs).toISOString(),
          saleType: 'welcome',
          discountPct: 60,
          label: 'Welcome Offer (60% OFF)',
        });
      }

      // 3. Past 48 hours and no custom sale -> Standard ₹999 Base Price
      return NextResponse.json({
        basePrice,
        price: 999,
        isSaleLive: false,
        endsAt: null,
        saleType: 'none',
        discountPct: 0,
        label: 'Standard Annual Pass',
      });
    }

    // Anonymous visitor: default 60% off preview
    return NextResponse.json({
      basePrice,
      price: 399,
      isSaleLive: true,
      endsAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      saleType: 'welcome',
      discountPct: 60,
      label: 'Welcome Offer (60% OFF)',
    });
  } catch (err) {
    console.error('[pricing] error:', err);
    return NextResponse.json(
      {
        basePrice: 999,
        price: 399,
        isSaleLive: true,
        endsAt: null,
        saleType: 'welcome',
        discountPct: 60,
        label: 'Welcome Offer',
      },
      { status: 500 }
    );
  }
}
