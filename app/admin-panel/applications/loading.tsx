export default function AdminApplicationsLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-48"></div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
