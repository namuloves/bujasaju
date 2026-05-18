import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 부자사주",
  description: "부자사주(富者四柱)의 개인정보 처리방침입니다.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        개인정보처리방침
      </h1>
      <p className="mt-2 text-sm text-gray-500">최종 수정일: 2026-05-18</p>

      <div className="mt-10 space-y-8 text-[15px] leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 수집하는 정보</h2>
          <p className="mt-2">
            부자사주는 사용자의 사주를 계산하기 위해 생년월일·시간 등의
            입력값을 일시적으로 처리합니다. 이러한 입력값은 별도의 계정과
            연결되어 저장되지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 분석 도구</h2>
          <p className="mt-2">
            서비스 개선을 위해 Vercel Analytics 등 익명 통계 도구를
            사용할 수 있습니다. 개인을 식별할 수 있는 정보는 수집하지
            않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 쿠키</h2>
          <p className="mt-2">
            언어 설정 등 사용자 환경을 기억하기 위해 최소한의 쿠키 또는
            로컬 스토리지를 사용할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 제3자 제공</h2>
          <p className="mt-2">
            법령에 따른 요구가 있는 경우를 제외하고 사용자의 정보를
            제3자에게 제공하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 문의</h2>
          <p className="mt-2">
            개인정보와 관련된 문의는{" "}
            <a href="mailto:hello@bujasaju.com" className="text-indigo-600 hover:underline">
              hello@bujasaju.com
            </a>
            으로 보내주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
