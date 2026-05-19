import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/**
 * MatchUnlockEmail — sent after a visitor unlocks the gate on the match
 * results page. Lists the billionaires that share their day-pillar, with
 * photo + name + country/industry + net worth.
 *
 * Renders to HTML via @react-email/components — Tailwind-style inline
 * styles only, no external CSS.
 */

const USD_TO_KRW = 1480.71;

function formatWorthKrw(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조 원`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억 원`;
}

const NATIONALITY_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', RU: '러시아', BR: '브라질', CA: '캐나다',
  AE: 'UAE', SA: '사우디', SE: '스웨덴', AU: '호주', IT: '이탈리아',
  ES: '스페인', NL: '네덜란드', CH: '스위스', SG: '싱가포르', HK: '홍콩',
  TW: '대만', TH: '태국', MX: '멕시코', AR: '아르헨티나', NO: '노르웨이',
  ID: '인도네시아', PH: '필리핀', MY: '말레이시아', VN: '베트남',
};

function nationalityKo(code: string | undefined): string {
  if (!code) return '';
  return NATIONALITY_KO[code] || code;
}

/** Stripped-down person shape — we don't want the email to depend on the
 *  full EnrichedPerson type, so the API route projects a thin payload. */
export interface MatchPerson {
  id: string;
  name: string;
  nameKo?: string | null;
  photoUrl?: string | null;
  nationality?: string;
  industry?: string;
  netWorth: number;
  /** One-paragraph Korean bio (~120 chars). Shown under the meta line
   *  in the card. Falls back to the English `bio` when absent. */
  bioKo?: string | null;
  bio?: string | null;
}

interface Props {
  /** User's day-pillar string, e.g. "임진" */
  ilju: string;
  matches: MatchPerson[];
  /** Origin used to build absolute links (since email clients can't resolve relative URLs). */
  origin?: string;
}

const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Segoe UI", sans-serif',
    margin: 0,
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '560px',
    padding: '32px 28px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
  },
  logoSub: {
    fontSize: '12px',
    color: '#888',
    margin: '4px 0 28px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: 1.35,
    margin: '0 0 12px',
  },
  intro: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.65,
    margin: '0 0 24px',
  },
  card: {
    display: 'block',
    backgroundColor: '#fafafa',
    border: '1px solid #ececec',
    borderRadius: '10px',
    padding: '14px 16px',
    margin: '0 0 10px',
    textDecoration: 'none',
  },
  cardRow: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  photo: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  name: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  meta: {
    fontSize: '12px',
    color: '#888',
    margin: '2px 0 0',
  },
  bio: {
    fontSize: '12.5px',
    color: '#555',
    lineHeight: 1.6,
    margin: '10px 0 0',
    paddingTop: '10px',
    borderTop: '1px solid #f0f0f0',
  },
  worth: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1a1a1a',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
    margin: 0,
  },
  ctaWrap: {
    textAlign: 'center' as const,
    margin: '28px 0 0',
  },
  cta: {
    display: 'inline-block',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px 22px',
    borderRadius: '8px',
    textDecoration: 'none',
  },
  divider: {
    border: 0,
    borderTop: '1px solid #ececec',
    margin: '32px 0 20px',
  },
  footer: {
    fontSize: '11px',
    color: '#999',
    lineHeight: 1.6,
    textAlign: 'center' as const,
    margin: 0,
  },
  footerLink: {
    color: '#1769ff',
    textDecoration: 'underline',
  },
};

export default function MatchUnlockEmail({ ilju, matches, origin = 'https://bujasaju.com' }: Props) {
  const count = matches.length;
  const preview = `${ilju} 일주의 부자 ${count}명 — ${matches.slice(0, 2).map((m) => m.nameKo || m.name).join(', ')}${count > 2 ? ' 외' : ''}`;

  return (
    <Html lang="ko">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.logo}>부자사주</Text>
          <Text style={styles.logoSub}>富者四柱 · 세계 부자들의 사주</Text>

          <Text style={styles.heading}>
            {ilju} 일주의 부자 {count}명을 소개해드려요
          </Text>
          <Text style={styles.intro}>
            안녕하세요! 부자사주 결과를 받아주셔서 감사합니다. 당신과 같은
            <strong> {ilju} 일주</strong>를 가진 부자 {count}명을 정리했어요.
            누구인지 확인해보세요.
          </Text>

          {matches.map((p) => {
            const displayName = p.nameKo || p.name;
            const country = nationalityKo(p.nationality);
            const industry = p.industry || '';
            const meta = [country, industry].filter(Boolean).join(' · ');
            const photoSrc = p.photoUrl
              ? (p.photoUrl.startsWith('//') ? `https:${p.photoUrl}` : p.photoUrl)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=120&background=random&bold=true`;
            const profileUrl = `${origin}/profile/${p.id}`;
            // Bio: prefer Korean, fall back to English. The server route
            // composes a 2-4 sentence paragraph (bioKo + deep-bio) before
            // sending — cap is generous so the whole paragraph fits.
            const bioRaw = (p.bioKo || p.bio || '').trim();
            const bio = bioRaw.length > 700 ? bioRaw.slice(0, 698).trimEnd() + '…' : bioRaw;

            return (
              <Link key={p.id} href={profileUrl} style={styles.card}>
                <table style={styles.cardRow}>
                  <tr>
                    <td style={{ width: '52px', verticalAlign: 'middle' }}>
                      <Img src={photoSrc} alt={p.name} width="52" height="52" style={styles.photo} />
                    </td>
                    <td style={{ paddingLeft: '14px', verticalAlign: 'middle' }}>
                      <Text style={styles.name}>{displayName}</Text>
                      {meta && <Text style={styles.meta}>{meta}</Text>}
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      <Text style={styles.worth}>{formatWorthKrw(p.netWorth)}</Text>
                    </td>
                  </tr>
                </table>
                {bio && <Text style={styles.bio}>{bio}</Text>}
              </Link>
            );
          })}

          <Section style={styles.ctaWrap}>
            <Link href={origin} style={styles.cta}>
              부자사주에서 더 알아보기 →
            </Link>
          </Section>

          <Hr style={styles.divider} />

          <Text style={styles.footer}>
            이 메일은 부자사주 결과 페이지에서 이메일을 남겨주신 분께만 발송됩니다.<br />
            구독 취소 또는 문의:{' '}
            <Link href="mailto:hello@bujasaju.com" style={styles.footerLink}>hello@bujasaju.com</Link>
            <br />© 2026 부자사주 · {origin.replace(/^https?:\/\//, '')}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
