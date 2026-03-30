'use client';

import QRCode from 'react-qr-code';

interface Props {
  value: string;
}

export default function QrCodeDisplay({ value }: Props) {
  return (
    <div className="inline-block bg-white p-3 border border-gray-200 rounded-md">
      <QRCode value={value} size={128} />
    </div>
  );
}
