export function JoinQrCode({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`
  return (
    <img
      alt="QR code for the join link"
      width={180}
      height={180}
      className="rounded-lg border border-border/60 bg-white p-2"
      src={src}
    />
  )
}
