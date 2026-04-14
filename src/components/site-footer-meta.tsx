"use client";

export type FooterMetaDisplayScope = "none" | "access" | "home" | "both";

export interface FooterMetaData {
  enabled: boolean;
  displayScope: FooterMetaDisplayScope;
  icpEnabled: boolean;
  icpNumber: string;
  icpLink: string;
  psbEnabled: boolean;
  psbNumber: string;
  psbLink: string;
}

interface SiteFooterMetaProps {
  config: FooterMetaData;
  page: "access" | "home";
}

export default function SiteFooterMeta({ config, page }: SiteFooterMetaProps) {
  if (!config.enabled || config.displayScope === "none") {
    return null;
  }

  if (config.displayScope === "access" && page !== "access") {
    return null;
  }
  if (config.displayScope === "home" && page !== "home") {
    return null;
  }

  const showIcp = config.icpEnabled && config.icpNumber.trim();
  const showPsb = config.psbEnabled && config.psbNumber.trim();

  if (!showIcp && !showPsb) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 py-2 sm:py-3 px-4 text-center">
      <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-white/50 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
        {showIcp &&
          (config.icpLink ? (
            <a
              href={config.icpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              {config.icpNumber}
            </a>
          ) : (
            <span>{config.icpNumber}</span>
          ))}
        {showPsb &&
          (config.psbLink ? (
            <a
              href={config.psbLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              {config.psbNumber}
            </a>
          ) : (
            <span>{config.psbNumber}</span>
          ))}
      </div>
    </div>
  );
}
