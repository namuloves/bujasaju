import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개 | 부자사주",
  description: "부자사주(富者四柱)는 세계 부자들의 사주 팔자를 분석해 보여주는 프로젝트입니다.",
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">소개</h1>
      <p className="mt-2 text-sm text-gray-500">부자사주 富者四柱</p>

      <div className="mt-10 space-y-6 text-[15px] leading-7 text-gray-700">
        <p>
          부자사주는 세계 부자들의 생년월일을 사주 팔자(四柱八字)로 변환해
          공통점과 차이점을 분석하는 프로젝트입니다.
        </p>
        <p>
          일주, 격국, 월지 등으로 부자들의 사주를 검색하고, 자신의 사주와
          비슷한 부자를 찾아볼 수 있습니다.
        </p>
        <p>
          본 사이트의 내용은 학술적·문화적 흥미를 위한 것이며, 투자나
          재무적 결정을 위한 조언이 아닙니다.
        </p>
        <p>
          문의: <a href="mailto:hello@bujasaju.com" className="text-indigo-600 hover:underline">hello@bujasaju.com</a>
        </p>
      </div>
    </main>
  );
}
