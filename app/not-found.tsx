import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-500 mb-6">页面不存在</p>
        <Link
          href="/"
          className="text-sm text-blue-500 hover:underline"
        >
          返回首页
        </Link>
      </div>
    </main>
  )
}
