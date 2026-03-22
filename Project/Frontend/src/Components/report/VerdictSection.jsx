export default function VerdictSection({ verdictHTML }) {
  if (!verdictHTML) return null

  return (
    <div
      dangerouslySetInnerHTML={{ __html: verdictHTML }}
    />
  )
}