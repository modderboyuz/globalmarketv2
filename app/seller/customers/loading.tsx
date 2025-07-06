export default function SellerCustomersLoading() {
  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-200"></div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-beautiful">
                <div className="p-6 text-center">
                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card-beautiful mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                <div className="w-48 h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Customers List */}
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded-2xl">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-40"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="text-center">
                          <div className="h-5 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                        </div>
                        <div className="text-center">
                          <div className="h-5 bg-gray-200 rounded w-20 mx-auto mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-24 ml-auto"></div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
