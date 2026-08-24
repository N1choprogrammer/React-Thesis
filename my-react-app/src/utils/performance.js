export const measureTime = async (label, callback) => {
  const start = performance.now()

  try {
    const result = await callback()

    const end = performance.now()
    const duration = end - start

    console.log(
      `⏱️ ${label}: ${(duration / 1000).toFixed(3)} seconds`
    )

    return result
  } catch (error) {
    const end = performance.now()
    const duration = end - start

    console.error(
      `❌ ${label} failed after ${(duration / 1000).toFixed(3)} seconds`,
      error
    )

    throw error
  }
}