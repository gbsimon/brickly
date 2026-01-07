export default function Library() {
  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Sets</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Your library is empty</p>
          <p className="text-gray-400 text-sm mt-2">Add your first set to get started</p>
        </div>
      </main>
    </div>
  );
}

