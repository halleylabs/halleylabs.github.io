// Engraved plates, one per project: a hairline drawing on a 240 x 160 plate, in ink only.
// Classes: "d" draws itself in on reveal, "f" is a faint construction line, "k" is a solid dot,
// and one named group per drawing moves when the plate is hovered (styles live in Plate.astro).
export const ART: Record<string, string> = {
  faultline: `
    <g class="m-left"><path class="d f" d="M22 34 H106 L95 60 L110 84 L97 110 L104 134 H22 Z"/><path class="d" d="M44 58 L68 84 L44 110"/><circle class="k" cx="44" cy="58" r="1.8"/><circle class="k" cx="68" cy="84" r="1.8"/><circle class="k" cx="44" cy="110" r="1.8"/></g>
    <g class="m-right"><path class="d f" d="M134 34 H218 V134 H130 L123 110 L136 84 L121 60 Z"/><path class="d" d="M172 58 L196 98 L168 122"/><circle class="k" cx="172" cy="58" r="1.8"/><circle class="k" cx="196" cy="98" r="1.8"/><circle class="k" cx="168" cy="122" r="1.8"/></g>
    <path class="d strong" d="M114 24 L102 58 L117 84 L104 110 L112 144"/>`,
  tring: `
    <path class="d" d="M38 46 h34 a6 6 0 0 1 6 6 v56 a6 6 0 0 1 -6 6 h-34 a6 6 0 0 1 -6 -6 v-56 a6 6 0 0 1 6 -6 z"/><circle class="d" cx="55" cy="66" r="10"/><path class="d f" d="M44 94 h22 M44 102 h22"/>
    <g class="m-waves"><path class="d f w1" d="M100 62 a26 26 0 0 1 0 36"/><path class="d f w2" d="M114 52 a40 40 0 0 1 0 56"/><path class="d f w3" d="M128 42 a54 54 0 0 1 0 76"/></g>
    <path class="d" d="M156 80 h8 l5 -18 l7 36 l7 -46 l7 52 l7 -34 l5 10 h12"/>`,
  witness: `
    <g class="m-reel"><circle class="d" cx="72" cy="72" r="38"/><circle class="d f" cx="72" cy="72" r="24"/><circle class="d" cx="72" cy="72" r="6"/><path class="d f" d="M72 34 V48 M72 96 V110 M34 72 H48 M96 72 H110"/></g>
    <g class="m-reel"><circle class="d" cx="168" cy="72" r="38"/><circle class="d f" cx="168" cy="72" r="18"/><circle class="d" cx="168" cy="72" r="6"/><path class="d f" d="M168 34 V54 M168 90 V110 M130 72 H150 M186 72 H206"/></g>
    <path class="d" d="M72 110 L98 138 H142 L168 110"/><path class="d f" d="M104 138 v-8 h32 v8"/>`,
  "quicky-wiki": `
    <g class="m-fan"><rect class="d f c1" x="66" y="30" width="108" height="72" rx="3"/><rect class="d fill c2" x="66" y="42" width="108" height="72" rx="3"/><rect class="d fill c3" x="66" y="54" width="108" height="72" rx="3"/></g>
    <path class="d" d="M80 74 H150 M80 86 H138 M80 98 H128 M80 110 H118"/><path class="d f" d="M184 70 h18 M184 84 h28 M184 98 h12"/><circle class="k" cx="160" cy="110" r="2"/>`,
  fasthands: `
    <rect class="d f" x="18" y="22" width="204" height="120" rx="5"/><path class="d f" d="M18 38 H222"/><circle class="k" cx="28" cy="30" r="1.6"/><circle class="k" cx="36" cy="30" r="1.6"/>
    <rect class="d" x="40" y="58" width="56" height="24" rx="3"/><rect class="d" x="148" y="100" width="52" height="24" rx="3"/><path class="d f" d="M50 70 h30 M158 112 h24"/>
    <path class="d f dash" d="M68 82 C 92 132, 128 70, 160 104"/><g class="m-cursor"><path class="d fill" d="M0 0 L0 14 L4 10.5 L7 16.5 L9.2 15.4 L6.3 9.6 L11 9.4 Z"/></g>`,
  samemark: `
    <g><rect class="d" x="44" y="26" width="70" height="108" rx="3"/><path class="d f" d="M56 46 H100 M56 58 H104 M56 70 H90 M56 90 H104 M56 102 H96 M56 114 H84"/></g>
    <g class="m-slide"><rect class="d fill" x="126" y="26" width="70" height="108" rx="3"/><path class="d f" d="M138 46 H182 M138 58 H186 M138 70 H172 M138 90 H186 M138 102 H178 M138 114 H166"/></g>`,
  agentreplay: `
    <rect class="d" x="26" y="48" width="188" height="64" rx="4"/><path class="d f" d="M26 60 H214 M26 100 H214"/>
    <path class="d f" d="M40 52 v4 M56 52 v4 M72 52 v4 M88 52 v4 M104 52 v4 M120 52 v4 M136 52 v4 M152 52 v4 M168 52 v4 M184 52 v4 M200 52 v4 M40 104 v4 M56 104 v4 M72 104 v4 M88 104 v4 M104 104 v4 M120 104 v4 M136 104 v4 M152 104 v4 M168 104 v4 M184 104 v4 M200 104 v4"/>
    <rect class="d" x="98" y="68" width="44" height="24" rx="2"/><g class="m-loop"><path class="d" d="M120 28 a52 52 0 1 1 -40 18"/><path class="d" d="M76 38 l4 8 l8 -3"/></g>`,
  pact: `
    <g class="m-chain"><circle class="d" cx="62" cy="80" r="24"/><circle class="d" cx="120" cy="80" r="24"/><circle class="d" cx="178" cy="80" r="24"/></g>
    <path class="d f" d="M50 80 h24 M108 80 h24 M166 80 h24"/><path class="d" d="M54 80 l6 6 l10 -12"/><path class="d" d="M112 80 l6 6 l10 -12"/><path class="d" d="M170 80 l6 6 l10 -12"/>
    <path class="d f" d="M62 112 v14 h116 v-14"/>`,
  guardian: `
    <path class="d f" d="M20 126 H220"/><path class="d f" d="M150 126 l14 -28 l14 28 M156 112 h16"/>
    <rect class="d" x="44" y="58" width="14" height="68" rx="2"/><circle class="d" cx="51" cy="58" r="9"/>
    <g class="m-arm"><path class="d" d="M58 56 H198 v8 H58"/><path class="d f" d="M78 56 l8 8 M102 56 l8 8 M126 56 l8 8 M150 56 l8 8 M174 56 l8 8"/></g>`,
  "context-broker": `
    <rect class="d f" x="30" y="22" width="76" height="116" rx="3"/><path class="d f" d="M40 36 H96 M40 46 H92 M40 56 H96 M40 66 H84 M40 76 H96 M40 86 H90 M40 96 H96 M40 106 H80 M40 116 H94 M40 126 H88"/>
    <path class="d" d="M116 80 h22 M132 74 l6 6 l-6 6"/>
    <g class="m-tree"><path class="d" d="M156 46 h40 M164 46 v62 M164 64 h28 M164 82 h22 M164 100 h30"/><circle class="k" cx="156" cy="46" r="2"/><circle class="k" cx="192" cy="64" r="1.8"/><circle class="k" cx="186" cy="82" r="1.8"/><circle class="k" cx="194" cy="100" r="1.8"/></g>`,
  unclaude: `
    <rect class="d" x="24" y="28" width="192" height="104" rx="5"/><path class="d f" d="M24 44 H216"/><circle class="k" cx="34" cy="36" r="1.6"/><circle class="k" cx="42" cy="36" r="1.6"/>
    <path class="d" d="M44 66 l12 10 l-12 10"/><path class="d f" d="M66 86 h60 M44 104 h96 M44 116 h70"/><g class="m-blink"><rect class="k" x="130" y="80" width="8" height="12"/></g>
    <g class="m-gear"><circle class="d" cx="184" cy="98" r="12"/><circle class="d f" cx="184" cy="98" r="4"/><path class="d f" d="M184 80 v5 M184 111 v5 M166 98 h5 M197 98 h5"/></g>`,
  voila: `
    <rect class="d" x="24" y="30" width="150" height="96" rx="4"/><path class="d f" d="M24 46 H174"/><path class="d f" d="M40 62 h70 M40 74 h50 M40 96 h110"/>
    <g class="m-zoom"><rect class="d" x="104" y="58" width="56" height="40" rx="2"/></g>
    <path class="d" d="M186 64 l26 -14 v60 l-26 -14 z"/><circle class="d" cx="199" cy="80" r="0"/><path class="d f" d="M24 140 H212"/><circle class="k" cx="98" cy="140" r="2.2"/>`,
  sheetstream: `
    <rect class="d" x="24" y="30" width="96" height="100" rx="3"/><path class="d f" d="M24 50 H120 M24 70 H120 M24 90 H120 M24 110 H120 M56 30 V130 M88 30 V130"/>
    <path class="d" d="M120 66 h30 c8 0 8 28 0 28 h-30"/>
    <g class="m-rows"><path class="d f" d="M160 60 h56 M160 72 h56 M160 84 h56 M160 96 h56 M160 108 h56"/></g><path class="d" d="M156 52 h64 v64 h-64"/>`,
  "purify-edge": `
    <path class="d" d="M50 36 H190 L140 92 V128 L100 140 V92 Z"/><path class="d f" d="M66 52 H174"/>
    <g class="m-drop"><path class="d" d="M86 18 l-8 8 l8 8 M154 18 l8 8 l-8 8"/><path class="d f" d="M112 18 l12 16"/></g>
    <path class="d f" d="M120 140 v12"/><circle class="k" cx="120" cy="155" r="1.8"/>`,
};
