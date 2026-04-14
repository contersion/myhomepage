"use client";

interface AccessBackgroundProps {
  backgroundData: {
    url: string | null;
    blur: number;
    overlay: number;
  } | null;
}

export default function AccessBackground({ backgroundData }: AccessBackgroundProps) {
  const hasBg = !!backgroundData?.url;

  return (
    <>
      {hasBg ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundData.url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900" />
      )}

      {hasBg ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${backgroundData.blur}px)`,
              WebkitBackdropFilter: `blur(${backgroundData.blur}px)`,
            }}
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: backgroundData.overlay }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}
    </>
  );
}
