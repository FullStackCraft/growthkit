import { analyzeContactMessage, isEnglishLikeText, isSpamContactMessage } from '../src';

// FUL-389: message bodies only; no submitter email addresses in public fixtures.
const OBSERVED_PITCHES = [
  {
    reason: 'sales_page_pitch',
    message: "Hi, I'm Luis. I saw The Wheel Screener and like what you're building. I put together a new sales page for it, in the same format that took several financial products to six figures in a few months. Happy to show it to you free, no strings attached. Want me to send it over? Thanks, Luis",
  },
  {
    reason: 'traffic_generation_pitch',
    message: 'We help businesses get seen online fast - usually within 24 hours. You choose the keywords, and we drive the right visitors straight to your site.\nCan I show you how it works?',
  },
];

describe('contact message spam filtering', () => {
  it.each(OBSERVED_PITCHES)('rejects the observed $reason from FUL-389', ({ message, reason }) => {
    // These are readable English: the previous language guard alone accepts them.
    expect(isEnglishLikeText(message)).toBe(true);
    const result = analyzeContactMessage(message);
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toEqual([reason]);
    expect(isSpamContactMessage(message)).toBe(true);
  });

  it.each(OBSERVED_PITCHES)('handles formatting variants of $reason', ({ message, reason }) => {
    const variant = message.toUpperCase().replace(/'/g, '\u2019').replace(/ /g, '\n\t');
    expect(analyzeContactMessage(variant).reasons).toContain(reason);
  });

  it('handles an escaped newline in a copied form payload', () => {
    const message = OBSERVED_PITCHES[1].message.replace(/\n/g, '\\n');
    expect(analyzeContactMessage(message).reasons).toContain('traffic_generation_pitch');
  });

  it.each([
    'We provide SEO and link building services for your business. Can I send you our pricing?',
    'I can offer search engine optimisation for your site. Are you open to a quick call?',
    'Our team specializes in SEO. Can we share a proposal?',
  ])('rejects SEO service outreach: %s', (message) => {
    // American and British spelling are supported.
    expect(analyzeContactMessage(message).reasons).toContain('seo_service_pitch');
  });

  it.each([
    'we help SaaS tools get reach',
    'we help SaaS tools get reach. Can I show you?',
    'We help businesses with tiktok vids.',
    'We help businesses with marketing.',
    'We help indie founders build a viral tiktok channel from with real niche followers. We take full creative control, we handle the strategy, content creation, and compliance, so you just have to spend about 1 minute a day uploading the videos we send you after you personally approved it. The service will be free for 7 days and I will be creating videos for you. After 7 days, the cost will only be $30/monthly and no additional costs. Please do let me know if you are still interested to learn more :)',
    'Our team specializes in marketing. We help startups grow on TikTok.',
    'We specialize in tiktok videos for indie hackers.',
  ])('rejects agency and marketing outreach: %s', (message) => {
    const result = analyzeContactMessage(message);
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain('agency_marketing_pitch');
    expect(isSpamContactMessage(message)).toBe(true);
  });

  it.each([
    'Hi, can you help me with my subscription?',
    'I was charged twice. Can you refund the duplicate payment?',
    'I cannot log in to The Wheel Screener. Can you help reset my account?',
    'Need help with ES/NQ exports and VPOC data.',
    'Does VannaCharm provide historical gamma and vanna data through the API?',
    'Can you add a filter for stocks with high options volume?',
    'The CodeVideo export is stuck. Can I send you the error log?',
    'Can ChatVideoLab generate a video for my sales page?',
    'I run an SEO agency and need help with my subscription.',
    'Can you add keywords to the search filter?',
    'How do I track referral traffic to my site with GrowthKit?',
    'Your sales page says free exports but I was charged. Can you help?',
    'We help businesses with SEO. I bought CodeVideo and cannot export my video.',
    'I built a new landing page for my business and the referral tracker is broken.',
    'I would like a demo of your API before subscribing.',
    'Could you show me how it works? I need help with the dashboard.',
    'I am interested in job opportunities. Do you have any open roles?',
    'Is The Wheel Screener a broker?',
    'The api is not working',
    'How can I generate an api',
    'I purchased starter plan but it still shows free',
    'want to upgade from starter to premium',
  ])('preserves legitimate contact: %s', (message) => {
    expect(analyzeContactMessage(message)).toMatchObject({ isSpam: false, reasons: [] });
    expect(isSpamContactMessage(message)).toBe(false);
  });

  it.each(['UFbwWZaefxpMaphkVDvcTKWg', 'WHshuGOZIdPDWXDd', 'asdfasdfasdfasdf', ''])('retains the existing gibberish check: %s', (message) => {
    const result = analyzeContactMessage(message);
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain('not_english_like');
    expect(result.englishLike?.isEnglishLike).toBe(false);
  });

  it('can disable only the English-like guard for multilingual forms', () => {
    expect(analyzeContactMessage('\u8bf7\u5e2e\u6211\u5904\u7406\u8ba2\u9605\u95ee\u9898', { englishLike: false })).toEqual({
      isSpam: false, reasons: [], englishLike: null,
    });
    for (const { message, reason } of OBSERVED_PITCHES) {
      expect(analyzeContactMessage(message, { englishLike: false }).reasons).toEqual([reason]);
    }
  });

  it('passes English-like options through without changing the old API', () => {
    expect(analyzeContactMessage('Hi, can you help?', { englishLike: { minLetters: 100 } }).reasons)
      .toContain('not_english_like');
    expect(isEnglishLikeText('Hi, can you help?')).toBe(true);
  });

  it('does not retain state across calls', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(isSpamContactMessage(OBSERVED_PITCHES[0].message)).toBe(true);
      expect(isSpamContactMessage('Can you help me with my account?')).toBe(false);
    }
  });
});
