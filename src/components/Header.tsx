'use client';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              사주부자 <span className="text-indigo-600">四柱富者</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              세계 부자들의 사주 분석 - Browse the rich by 四柱
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">
              나와 같은 사주 구조를 가진 부자는?
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
