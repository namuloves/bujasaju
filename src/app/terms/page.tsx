import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 부자사주",
  description: "부자사주(富者四柱) 서비스 이용약관입니다.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">이용약관</h1>
      <p className="mt-2 text-sm text-gray-500">최종 수정일: 2026-05-18</p>

      <div className="mt-10 space-y-8 text-[15px] leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 서비스 안내</h2>
          <p className="mt-2">
            부자사주는 공개된 정보를 바탕으로 인물의 사주 팔자를 분석해
            보여주는 정보 서비스입니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 면책 조항</h2>
          <p className="mt-2">
            본 사이트에서 제공하는 사주 분석과 콘텐츠는 학술적·문화적
            참고용입니다. 투자, 재무, 의료, 법률 등 중요한 결정을 위한
            조언으로 사용해서는 안 됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 콘텐츠 권리</h2>
          <p className="mt-2">
            사이트의 분석 글과 디자인은 별도의 표기가 없는 한 부자사주에
            귀속됩니다. 외부 사진과 인용은 각 출처의 권리를 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 금지 행위</h2>
          <p className="mt-2">
            서비스를 자동화된 방식으로 과도하게 크롤링하거나, 타인의 권리를
            침해하는 용도로 사용하는 행위를 금지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 약관 변경</h2>
          <p className="mt-2">
            본 약관은 필요에 따라 변경될 수 있으며, 변경 시 본 페이지에
            게시합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. 문의</h2>
          <p className="mt-2">
            <a href="mailto:hello@bujasaju.com" className="text-indigo-600 hover:underline">
              hello@bujasaju.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
