export default function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <a href="/" className="text-base font-semibold tracking-tight text-gray-900">
              부자사주 <span className="text-indigo-600">富者四柱</span>
            </a>
            <p className="mt-2 text-xs text-gray-500">
              세계 부자들의 사주를 분석합니다.
            </p>
          </div>

          <nav
            aria-label="footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600"
          >
            <a href="/browse-clean" className="hover:text-gray-900 transition-colors">
              부자 사주 둘러보기
            </a>
            <a href="/about" className="hover:text-gray-900 transition-colors">
              소개
            </a>
            <a href="/privacy" className="hover:text-gray-900 transition-colors">
              개인정보처리방침
            </a>
            <a href="/terms" className="hover:text-gray-900 transition-colors">
              이용약관
            </a>
            <span className="text-gray-500">
              문의:{" "}
              <a
                href="mailto:hello@bujasaju.com"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                hello@bujasaju.com
              </a>
            </span>
          </nav>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          © {new Date().getFullYear()} 부자사주. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
