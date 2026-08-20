import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Landmark, ExternalLink, Search, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

export function GovtSchemes() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const schemes = useMemo(
    () => [
      { title: t('pm_kisan'), desc: t('pm_kisan_desc'), link: 'https://pmkisan.gov.in/', category: 'Direct Income' },
      { title: t('rythu_bandhu'), desc: t('rythu_bandhu_desc'), link: 'https://rythubandhu.telangana.gov.in/', category: 'Direct Income' },
      { title: t('pmfby'), desc: t('pmfby_desc'), link: 'https://pmfby.gov.in/', category: 'Crop Insurance' },
      { title: t('kcc'), desc: t('kcc_desc'), link: 'https://www.rbi.org.in/commonperson/English/Scripts/Notification.aspx?Id=2335', category: 'Credit & Loans' },
      { title: t('shc'), desc: t('shc_desc'), link: 'https://soilhealth.dac.gov.in/', category: 'Soil Health' },
      { title: t('enam'), desc: t('enam_desc'), link: 'https://enam.gov.in/web/', category: 'Market Access' },
      { title: t('pmksy'), desc: t('pmksy_desc'), link: 'https://pmksy.gov.in/', category: 'Irrigation' },
      { title: t('rkvy'), desc: t('rkvy_desc'), link: 'https://rkvy.da.gov.in/', category: 'Infrastructure' },
      { title: t('agri_infra'), desc: t('agri_infra_desc'), link: 'https://agriinfra.dac.gov.in/', category: 'Infrastructure' },
      { title: t('nfsm'), desc: t('nfsm_desc'), link: 'https://nfsm.gov.in/', category: 'Productivity' },
      { title: t('smam'), desc: t('smam_desc'), link: 'https://farmech.dac.gov.in/', category: 'Mechanization' },
      { title: t('state_horti'), desc: t('state_horti_desc'), link: 'https://horticulture.telangana.gov.in/', category: 'Horticulture' },
    ],
    [t],
  );

  const filteredSchemes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return schemes;
    return schemes.filter(
      (item) => item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [schemes, searchQuery]);

  return (
    <div
      className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-8 lg:p-10 min-h-[calc(100vh-4rem)] flex flex-col bg-no-repeat bg-cover text-white rounded-2xl overflow-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      <div className="relative z-10 mx-auto max-w-6xl w-full flex-1 space-y-7 animate-fade-in">
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="aurora-glass-pill mb-1.5">
              <span>Farmer Welfare & Subsidies</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <Building2 size={24} className="text-emerald-300" />
              <span>{t('govt_schemes')}</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Official central & state agricultural support schemes
          </div>
        </div>

        {/* ═══ Search & Filter Surface (Strong Glass) ═══ */}
        <div className="aurora-glass-strong p-4 sm:p-5 rounded-[24px] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schemes by name, keyword, or benefit..."
              className="aurora-glass-input pl-10 text-xs py-2.5 w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70 w-full sm:w-auto justify-end">
            <span className="aurora-badge-info text-xs px-3 py-1 rounded-full font-semibold">
              {filteredSchemes.length} of {schemes.length} Active Schemes
            </span>
          </div>
        </div>

        {/* ═══ Government Schemes Grid ═══ */}
        {filteredSchemes.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredSchemes.map((scheme, idx) => (
              <article
                key={idx}
                className="aurora-glass-medium p-6 rounded-[24px] flex flex-col justify-between space-y-4 hover:bg-white/15 transition-all duration-200 group border border-white/15"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white/95 tracking-tight leading-snug group-hover:text-emerald-200 transition-colors">
                      {scheme.title}
                    </h3>
                    <div className="p-2 rounded-xl bg-white/10 text-emerald-300 shrink-0 border border-white/15">
                      <Landmark size={18} />
                    </div>
                  </div>

                  <span className="aurora-glass-pill text-[10.5px] font-medium text-white/75">
                    {scheme.category}
                  </span>

                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed pt-1">
                    {scheme.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <a
                    href={scheme.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full aurora-glass-button text-xs py-2.5 px-4 flex items-center justify-center gap-2 text-white font-medium hover:bg-white/20"
                  >
                    <span>{t('visit_website')}</span>
                    <ExternalLink size={14} className="text-emerald-300" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="aurora-glass-medium p-12 text-center rounded-[26px] text-sm text-white/60 space-y-2">
            <Landmark size={32} className="mx-auto text-white/40 mb-2" />
            <p className="font-semibold text-white/90">No government schemes matched your search</p>
            <p className="text-xs text-white/50">Try searching for keywords like "income", "insurance", "irrigation", or "soil".</p>
          </div>
        )}
      </div>
    </div>
  );
}