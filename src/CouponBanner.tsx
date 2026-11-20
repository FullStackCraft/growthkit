import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CouponBannerArtwork } from './CouponBannerArtwork';
import { couponBannerStyles } from './couponBannerStyles';
import { useCouponCampaign } from './CouponCampaignProvider';
import { CouponCountdown } from './CouponCountdown';
import { getCouponArtwork, getCouponOfferUrl } from './couponPresentation';
import type { ICouponCodeConfig } from './types/CouponCodeConfig';

export interface CouponBannerOffer {
  title: string;
  regularPrice: string;
  salePrice: string;
  checkoutHref: string;
  terms?: string;
  actionLabel?: string;
}

export interface CouponBannerProps {
  productName: string;
  offer?: CouponBannerOffer;
  plansHref?: string;
  discountScope?: string;
  theme?: 'light' | 'dark';
  accentColor?: string;
  className?: string;
  image?: { src: string; alt?: string };
}

export function CouponBanner(props: CouponBannerProps) {
  const campaign = useCouponCampaign(props.productName);
  if (!campaign) return null;
  const { coupon, expiresAt } = campaign;
  const dismissalKey = `growthkit:coupon:${coupon.productName}:${coupon.id}`;
  return <CouponDialog key={dismissalKey} {...props} coupon={coupon} expiresAt={expiresAt} dismissalKey={dismissalKey} />;
}

function CouponDialog({
  coupon, expiresAt, dismissalKey, offer, plansHref, discountScope, theme = 'light', accentColor, className, image,
}: CouponBannerProps & { coupon: ICouponCodeConfig; expiresAt: number; dismissalKey: string }) {
  const headingId = useId();
  const discountId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(dismissalKey) === '1';
    } catch {
      return false;
    }
  });
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };
  }, [dismissed]);

  if (dismissed) return null;

  const artwork = getCouponArtwork(coupon.couponName);
  const hasArt = artwork !== 'default' || Boolean(image);
  const externalOfferUrl = getCouponOfferUrl(coupon.couponCode);
  const checkoutOffer = externalOfferUrl ? undefined : offer;
  const actionHref = externalOfferUrl ?? checkoutOffer?.checkoutHref ?? plansHref;
  const opensNewTab = Boolean(externalOfferUrl ?? checkoutOffer);
  const discountLabel = `${coupon.discountPercent}% off`;
  const actionLabel = externalOfferUrl
    ? 'Visit AppSumo'
    : checkoutOffer?.actionLabel ?? (checkoutOffer ? `Get ${discountLabel}` : 'See discounted plans');
  const scope = discountScope?.trim();
  const basicDescription = `Use ${coupon.couponCode} for ${discountLabel} at Stripe Checkout.`;
  const hasExtraDescription = coupon.description.trim().toLowerCase() !== basicDescription.toLowerCase();

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(coupon.couponCode);
      setCopyStatus('Code copied.');
    } catch {
      setCopyStatus('Select the code to copy it manually.');
    }
  }

  function dismiss() {
    dialogRef.current?.close?.();
    setDismissed(true);
    try {
      window.sessionStorage.setItem(dismissalKey, '1');
    } catch {
      // The dialog can still be dismissed when storage is unavailable.
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={discountId}
      className={['gk-coupon-dialog', className].filter(Boolean).join(' ')}
      data-season={artwork}
      data-appearance={theme}
      data-layout={hasArt ? 'illustrated' : 'compact'}
      style={accentColor ? { '--gk-outline': accentColor } as CSSProperties : undefined}
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <style>{couponBannerStyles}</style>
      <div className="gk-coupon-layout">
        {hasArt && (
          <div className="gk-coupon-art">
            {image
              ? <img className="gk-coupon-art-image" src={image.src} alt={image.alt ?? ''} />
              : <CouponBannerArtwork artwork={artwork} />}
          </div>
        )}
        <div className="gk-coupon-content">
          <header className="gk-coupon-header">
            <h2 ref={headingRef} tabIndex={-1} id={headingId} className="gk-coupon-title">{coupon.couponName}</h2>
            {hasExtraDescription && <p className="gk-coupon-description">{coupon.description}</p>}
          </header>
          <div className="gk-coupon-deal">
            <p className="gk-coupon-number" id={discountId}>
              <strong className="gk-coupon-rate">
                <span className="gk-coupon-amount">{coupon.discountPercent}%</span>{' '}
                <span>off</span>
              </strong>
              {scope && <> <span className="gk-coupon-scope">{scope}</span></>}
            </p>
            {checkoutOffer && (
              <div className="gk-coupon-purchase">
                <div className="gk-coupon-purchase-details">
                  <span className="gk-coupon-purchase-title">{checkoutOffer.title}</span>
                  {checkoutOffer.terms && <span className="gk-coupon-purchase-terms">{checkoutOffer.terms}</span>}
                </div>
                <div className="gk-coupon-price">
                  <span className="gk-coupon-sr">Regular price </span><s>{checkoutOffer.regularPrice}</s>
                  <span className="gk-coupon-sr">Sale price </span><strong>{checkoutOffer.salePrice}</strong>
                </div>
              </div>
            )}
          </div>
          <CouponCountdown expiresAt={expiresAt} endsOn={coupon.couponEnd} />
          {!externalOfferUrl && (
            <div className="gk-coupon-code-row">
              <span className="gk-coupon-code"><span>Use code</span><code>{coupon.couponCode}</code></span>
              <button type="button" className="gk-coupon-copy" aria-label="Copy coupon code" onClick={copyCode}>
                <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="7" y="7" width="9" height="9" rx="1.5" /><path d="M5 13H4.5A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5V5" />
                </svg>
                Copy
              </button>
            </div>
          )}
          {actionHref && (
            <a className="gk-coupon-action" href={actionHref} onClick={dismiss}
              target={opensNewTab ? '_blank' : undefined} rel={opensNewTab ? 'noopener noreferrer' : undefined}>
              {actionLabel}
              {opensNewTab ? (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l8-8M5 4h7v7" />
                </svg>
              ) : <span aria-hidden="true">→</span>}
            </a>
          )}
          <div className="gk-coupon-status" role="status">{copyStatus}</div>
        </div>
        <button type="button" className="gk-coupon-close" aria-label="Dismiss coupon offer" onClick={dismiss}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </dialog>
  );
}
