// ============================================================
// Plague Knight: Vector — Pixel Art Sprite System
// 16-bit SNES-era dark medieval plague theme
// High-detail retro RPG quality (Chrono Trigger / FFVI style)
// ============================================================

const Sprites = (() => {

  // ---- Color Palette ----
  const C = {
    // Plague / sickly greens
    plagueGreen:    '#2d6e2d',
    darkGreen:      '#1a4a1a',
    deepGreen:      '#0e3a0e',
    sickYellow:     '#8a8a20',
    glowGreen:      '#44ff44',
    glowGreenMed:   '#33cc33',
    mutedGreen:     '#3a7a3a',
    paleGreen:      '#5aaa3a',
    toxicGreen:     '#30d830',
    cloakGreen:     '#1e5a1e',
    cloakHighlight: '#2a8a2a',
    cloakShadow:    '#0c2e0c',
    cloakMid:       '#1a5020',
    vialGlow:       '#66ff88',

    // Browns / wood
    darkBrown:      '#3a2010',
    medBrown:       '#5a3a1a',
    lightBrown:     '#8a6a3a',
    paleBrown:      '#a08050',
    wood:           '#6a4a2a',
    woodLight:      '#8a6a4a',
    woodDark:       '#4a2a10',
    woodGrain:      '#5a3820',
    thatch:         '#9a7a3a',
    thatchDark:     '#7a5a2a',
    thatchLight:    '#baa050',

    // Grays / stone / metal
    darkGray:       '#2a2a2a',
    medGray:        '#4a4a4a',
    lightGray:      '#6a6a6a',
    paleGray:       '#8a8a8a',
    stoneLight:     '#7a7a6a',
    stoneDark:      '#3a3a30',
    stoneMed:       '#5a5a4a',
    stoneWarm:      '#6a6050',
    metalShine:     '#b0b0c0',
    metalLight:     '#8a8a9a',
    metalMed:       '#5a5a6a',
    metalDark:      '#3a3a4a',
    ironDark:       '#2a2a3a',

    // Reds / enemies
    darkRed:        '#6a1a1a',
    medRed:         '#8a2a2a',
    brightRed:      '#cc3333',
    bloodRed:       '#4a0a0a',
    maroon:         '#5a1020',
    crimson:        '#aa2222',
    roseRed:        '#bb4040',

    // Blues / purples / night
    darkBlue:       '#1a1a3a',
    deepPurple:     '#2a1a3a',
    nightPurple:    '#1a0a2a',
    shadowPurple:   '#3a2a4a',
    midPurple:      '#4a3a5a',
    eyeWhite:       '#c0c0d0',
    smokePurple:    '#201030',
    wrapDark:       '#120820',

    // Warm / torch
    orange:         '#cc8833',
    warmYellow:     '#ddaa44',
    torchGlow:      '#ffcc66',
    gold:           '#ccaa33',
    brightGold:     '#eedd55',
    goldDark:       '#aa8822',
    goldDeep:       '#886610',
    amber:          '#ee9922',

    // Skin tones
    skin:           '#c8a878',
    skinDark:       '#a08060',
    skinLight:      '#d8c0a0',
    skinPale:       '#ddd0b8',
    skinShadow:     '#8a6848',
    skinHighlight:  '#e8d0b0',
    skinRosy:       '#c09878',

    // Cloth / clothing
    clothTan:       '#b0946a',
    clothDark:      '#7a6040',
    clothLight:     '#c8aa80',
    clothPale:      '#d8c0a0',

    // Basics
    black:          '#0a0a0a',
    nearBlack:      '#151515',
    offBlack:       '#1a1a1a',
    white:          '#e8e8e8',
    transparent:    null,

    // Tile extras
    mossGreen:      '#2a4a20',
    mortar:         '#2a2520',
    mortarLight:    '#3a3530',
    cobble1:        '#5a5a50',
    cobble2:        '#4a4a42',
    cobble3:        '#6a6a5a',
    cobbleLight:    '#7a7a68',
    dirtDark:       '#2a2210',
    grassDark:      '#0e1e08',
    grassMed:       '#1a2a10',
    grassLight:     '#243814',
    grassBright:    '#2e4418',
    flowerRed:      '#aa3030',
    flowerYellow:   '#ccaa40',

    // Awning
    awningRed:      '#bb3030',
    awningWhite:    '#ddccbb',
    awningRedDark:  '#882020',

    // Banner
    bannerRed:      '#cc2222',
    bannerRedDark:  '#881818',
  };

  const _ = null; // shorthand for transparent

  // ---- Helper: Draw Pixel Art from 2D Array ----
  function drawPixelArt(ctx, x, y, size, pixelData) {
    const rows = pixelData.length;
    const cols = pixelData[0].length;
    const pw = size / cols;
    const ph = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = pixelData[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(x + c * pw),
            Math.floor(y + r * ph),
            Math.ceil(pw),
            Math.ceil(ph)
          );
        }
      }
    }
  }

  // ---- Helper: Draw a single scaled pixel ----
  function px(ctx, x, y, pxSize, col, row, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.floor(x + col * pxSize),
      Math.floor(y + row * pxSize),
      Math.ceil(pxSize),
      Math.ceil(pxSize)
    );
  }

  // ============================================================
  // CHARACTERS
  // ============================================================

  // Plague Knight — hooded dark green cloak, glowing eyes, holding vial
  function player(ctx, x, y, size) {
    const S  = C.cloakShadow;   // darkest cloak
    const D  = C.deepGreen;     // dark cloak
    const G  = C.cloakGreen;    // mid cloak
    const M  = C.cloakMid;      // mid-light
    const H  = C.cloakHighlight;// highlight folds
    const E  = C.glowGreen;     // glowing eyes
    const E2 = C.glowGreenMed;  // eye edge
    const BK = C.black;
    const NB = C.nearBlack;
    const VG = C.vialGlow;      // vial glow
    const VB = C.toxicGreen;    // vial body
    const V2 = C.plagueGreen;   // vial dark
    const BR = C.darkBrown;
    const B2 = C.medBrown;
    const data = [
      [_,_,_,_,_,S, D, D, D, D, S, _,_,_,_,_],
      [_,_,_,_,S, D, G, G, G, G, D, S,_,_,_,_],
      [_,_,_,S, D, G, M, H, H, M, G, D, S,_,_,_],
      [_,_,_,S, D, G, M, M, M, M, G, D, S,_,_,_],
      [_,_,_,S, D, BK,NB,NB,NB,NB,BK,D, S,_,_,_],
      [_,_,_,S, D, BK,E, NB,NB,E, BK,D, S,_,_,_],
      [_,_,_,S, D, BK,E2,NB,NB,E2,BK,D, S,_,_,_],
      [_,_,_,_,S, D, BK,NB,NB,BK,D, S,_,_,_,_],
      [_,_,_,S, G, M, G, G, G, G, M, G, S,_,_,_],
      [_,_,S, G, M, H, G, D, D, G, H, M, G, S,_,_],
      [_,_,S, G, M, G, D, D, D, D, G, M, G, S,VG,_],
      [_,_,_,S, G, M, H, G, G, H, M, G, S, V2,VB,_],
      [_,_,_,_,S, G, G, D, D, G, G, S,_,V2,VG,_],
      [_,_,_,_,_,S, G, G, G, G, S,_,_,_,_,_],
      [_,_,_,_,_,BR,B2,BR,_,BR,B2,BR,_,_,_,_],
      [_,_,_,_,BR,B2,BR,_,_,_,BR,B2,BR,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Civilian — worried peasant with tan clothes
  function civilian(ctx, x, y, size) {
    const HR = C.darkBrown;     // hair
    const H2 = C.medBrown;      // hair highlight
    const SK = C.skin;          // skin base
    const SL = C.skinLight;     // skin highlight
    const SD = C.skinDark;      // skin shadow
    const SS = C.skinShadow;    // deep shadow
    const BK = C.black;         // eyes/mouth
    const CL = C.clothDark;     // shirt dark
    const CM = C.clothTan;      // shirt mid
    const CH = C.clothLight;    // shirt highlight
    const PT = C.medBrown;      // pants
    const PD = C.darkBrown;     // pants dark
    const BT = C.darkBrown;     // boots
    const B2 = C.woodDark;      // boot dark
    const data = [
      [_,_,_,_,_,_,HR,HR,HR,HR,_,_,_,_,_,_],
      [_,_,_,_,_,HR,H2,HR,HR,H2,HR,_,_,_,_,_],
      [_,_,_,_,HR,H2,HR,HR,HR,HR,H2,HR,_,_,_,_],
      [_,_,_,_,_,SK,SL,SK,SK,SL,SK,_,_,_,_,_],
      [_,_,_,_,_,SK,BK,SK,SK,BK,SK,_,_,_,_,_],
      [_,_,_,_,_,SD,SK,SK,SK,SK,SD,_,_,_,_,_],
      [_,_,_,_,_,SS,SK,BK,BK,SK,SS,_,_,_,_,_],
      [_,_,_,_,_,_,SD,SK,SK,SD,_,_,_,_,_,_],
      [_,_,_,_,CL,CM,CM,CM,CM,CM,CM,CL,_,_,_,_],
      [_,_,_,CL,CM,CH,CM,CL,CL,CM,CH,CM,CL,_,_,_],
      [_,_,_,SD,CM,CM,CM,CL,CL,CM,CM,CM,SD,_,_,_],
      [_,_,_,_,CL,CM,CH,CM,CM,CH,CM,CL,_,_,_,_],
      [_,_,_,_,_,CL,CM,CM,CM,CM,CL,_,_,_,_,_],
      [_,_,_,_,_,PT,PD,PT,PT,PD,PT,_,_,_,_,_],
      [_,_,_,_,_,BT,B2,BT,BT,B2,BT,_,_,_,_,_],
      [_,_,_,_,BT,B2,BT,_,_,BT,B2,BT,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Watchman — dark red uniform, metal helmet, small shield
  function watchman(ctx, x, y, size) {
    const ML = C.metalLight;    // helmet highlight
    const MM = C.metalMed;      // helmet mid
    const MD = C.metalDark;     // helmet dark
    const MS = C.metalShine;    // shine spot
    const R  = C.darkRed;       // uniform dark
    const R2 = C.medRed;        // uniform mid
    const R3 = C.maroon;        // uniform shadow
    const SK = C.skinDark;      // skin
    const SL = C.skin;          // skin light
    const BK = C.black;
    const WD = C.wood;          // shield wood
    const WK = C.woodDark;      // shield dark
    const WL = C.woodLight;     // shield light
    const BT = C.darkBrown;     // boots
    const B2 = C.medBrown;
    const data = [
      [_,_,_,_,_,MD,MM,MM,MM,MM,MD,_,_,_,_,_],
      [_,_,_,_,MD,ML,MS,ML,ML,ML,ML,MD,_,_,_,_],
      [_,_,_,_,MD,MM,MM,MM,MM,MM,MM,MD,_,_,_,_],
      [_,_,_,_,MD,MD,MD,MD,MD,MD,MD,MD,_,_,_,_],
      [_,_,_,_,_,SK,SL,SK,SK,SL,SK,_,_,_,_,_],
      [_,_,_,_,_,SK,BK,SK,SK,BK,SK,_,_,_,_,_],
      [_,_,_,_,_,SK,SK,SK,SK,SK,SK,_,_,_,_,_],
      [_,_,_,_,_,_,SK,SK,SK,SK,_,_,_,_,_,_],
      [_,_,WK,WD,R3,R, R2,R2,R2,R2,R, R3,_,_,_,_],
      [_,_,WK,WL,R3,R, R2,R, R, R2,R, R3,_,_,_,_],
      [_,_,WK,WD,R3,R, R2,R2,R2,R2,R, R3,_,_,_,_],
      [_,_,WK,WL,R3,R, R, R2,R2,R, R, R3,_,_,_,_],
      [_,_,WK,WD,_,R3,R, R, R, R, R3,_,_,_,_,_],
      [_,_,_,_,_,_,R3,R, R, R3,_,_,_,_,_,_],
      [_,_,_,_,_,BT,B2,BT,BT,B2,BT,_,_,_,_,_],
      [_,_,_,_,BT,B2,BT,_,_,BT,B2,BT,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Patrol — red armor over dark clothing, sword at side, walking pose
  function patrol(ctx, x, y, size) {
    const R  = C.medRed;        // armor mid
    const R2 = C.brightRed;     // armor highlight
    const R3 = C.darkRed;       // armor shadow
    const MM = C.metalMed;      // helmet/sword
    const ML = C.metalLight;    // metal highlight
    const MD = C.metalDark;     // metal dark
    const MS = C.metalShine;    // shine
    const SK = C.skinDark;
    const SL = C.skin;
    const BK = C.black;
    const NB = C.nearBlack;     // dark clothing
    const BT = C.darkBrown;
    const B2 = C.medBrown;
    const data = [
      [_,_,_,_,_,MD,MM,MM,MM,MD,_,_,_,_,_,_],
      [_,_,_,_,MD,ML,MS,ML,ML,ML,MD,_,_,_,_,_],
      [_,_,_,_,MD,MM,MM,MM,MM,MM,MD,_,_,_,_,_],
      [_,_,_,_,_,SK,SL,SK,SK,SL,_,_,_,_,_,_],
      [_,_,_,_,_,SK,BK,SK,BK,SK,_,_,_,_,_,_],
      [_,_,_,_,_,SK,SK,SK,SK,SK,_,_,_,_,_,_],
      [_,_,_,_,_,_,SK,SK,SK,_,_,_,_,_,_,_],
      [_,_,_,_,R3,R, R2,R2,R2,R, R3,_,ML,_,_,_],
      [_,_,_,R3,R, R2,R, R3,R, R2,R, R3,ML,_,_,_],
      [_,_,_,R3,R, R2,R, R3,R, R2,R, _,ML,_,_,_],
      [_,_,_,NB,R3,R, R2,R2,R2,R, R3,NB,ML,_,_,_],
      [_,_,_,_,NB,R3,R, R, R, R3,NB,_,MM,_,_,_],
      [_,_,_,_,_,NB,NB,NB,NB,NB,_,_,_,_,_,_],
      [_,_,_,_,_,BT,B2,_,B2,BT,_,_,_,_,_,_],
      [_,_,_,_,MM,BT,B2,_,B2,BT,MM,_,_,_,_,_],
      [_,_,_,_,BT,B2,_,_,_,B2,BT,_,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Gatekeeper — heavy black/dark red plate, large shield, imposing
  function gatekeeper(ctx, x, y, size) {
    const R  = C.darkRed;
    const R2 = C.maroon;
    const R3 = C.bloodRed;
    const BK = C.black;
    const NB = C.nearBlack;
    const OB = C.offBlack;
    const MM = C.metalMed;
    const ML = C.metalLight;
    const MD = C.metalDark;
    const MS = C.metalShine;
    const ID = C.ironDark;
    const SK = C.skinDark;
    const data = [
      [_,_,_,_,ID,MD,MM,MM,MM,MM,MD,ID,_,_,_,_],
      [_,_,_,ID,MD,MM,ML,MS,MS,ML,MM,MD,ID,_,_,_],
      [_,_,_,ID,MD,MM,MM,MM,MM,MM,MM,MD,ID,_,_,_],
      [_,_,_,_,ID,MD,MD,MD,MD,MD,MD,ID,_,_,_,_],
      [_,_,_,_,_,SK,BK,BK,BK,BK,SK,_,_,_,_,_],
      [_,_,_,_,_,SK,SK,SK,SK,SK,SK,_,_,_,_,_],
      [_,_,_,_,_,_,SK,SK,SK,SK,_,_,_,_,_,_],
      [_,ID,MD,MM,R3,R2,R, R, R, R, R2,R3,_,_,_,_],
      [_,ID,ML,MM,R3,R2,R, NB,NB,R, R2,R3,_,_,_,_],
      [_,ID,MS,ML,R3,R, R, R2,R2,R, R, R3,_,_,_,_],
      [_,ID,ML,MM,R3,R, NB,R, R, NB,R, R3,_,_,_,_],
      [_,ID,MD,MM,R3,R2,R, R, R, R, R2,R3,_,_,_,_],
      [_,ID,MD,ID,_,R3,R2,R, R, R2,R3,_,_,_,_,_],
      [_,_,_,_,_,_,R3,R2,R2,R3,_,_,_,_,_,_],
      [_,_,_,_,_,NB,OB,NB,NB,OB,NB,_,_,_,_,_],
      [_,_,_,_,NB,OB,NB,_,_,NB,OB,NB,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Town Guard — golden helmet with plume, red cape, full armor, sword drawn
  function townGuard(ctx, x, y, size) {
    const GO = C.gold;
    const GD = C.goldDark;
    const BG = C.brightGold;
    const R  = C.brightRed;
    const R2 = C.medRed;
    const R3 = C.crimson;
    const MM = C.metalMed;
    const ML = C.metalLight;
    const MD = C.metalDark;
    const MS = C.metalShine;
    const SK = C.skin;
    const SL = C.skinLight;
    const BK = C.black;
    const NB = C.nearBlack;
    const data = [
      [_,_,_,_,R, GO,BG,BG,BG,GO,R, _,_,_,_,_],
      [_,_,_,_,R2,GD,GO,BG,BG,GO,GD,R2,_,_,_,_],
      [_,_,_,_,_,GD,GO,GO,GO,GO,GD,_,_,_,_,_],
      [_,_,_,_,_,GD,GD,GD,GD,GD,GD,_,_,_,_,_],
      [_,_,_,_,_,SK,SL,SK,SK,SL,SK,_,_,_,_,_],
      [_,_,_,_,_,SK,BK,SK,SK,BK,SK,_,_,_,_,_],
      [_,_,_,_,_,_,SK,SK,SK,SK,_,_,_,_,_,_],
      [_,_,R2,MM,MD,ML,MM,MM,MM,ML,MD,MM,_,MS,_,_],
      [_,R2,R, MM,MD,ML,MM,MD,MD,MM,ML,MD,_,MS,_,_],
      [_,R2,R3,MM,MM,ML,MM,MD,MD,MM,ML,MM,MM,ML,_,_],
      [_,_,R2,MD,MM,ML,MS,MM,MM,MS,ML,MM,_,MS,_,_],
      [_,_,R3,_,MD,MM,MM,MD,MD,MM,MM,MD,_,MM,_,_],
      [_,_,_,_,_,MD,MM,MM,MM,MM,MD,_,_,_,_,_],
      [_,_,_,_,_,MD,ML,MD,MD,ML,MD,_,_,_,_,_],
      [_,_,_,_,MM,MD,ML,MD,MD,ML,MD,MM,_,_,_,_],
      [_,_,_,_,MD,MM,MD,_,_,MD,MM,MD,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Night Watch — near invisible, dark purple/black, ninja-like, smoke at feet
  function nightWatch(ctx, x, y, size) {
    const P  = C.nightPurple;
    const P2 = C.deepPurple;
    const P3 = C.shadowPurple;
    const W  = C.wrapDark;
    const S  = C.smokePurple;
    const BK = C.black;
    const NB = C.nearBlack;
    const OB = C.offBlack;
    const EW = C.eyeWhite;
    const data = [
      [_,_,_,_,_,_,W, W, W, W, _,_,_,_,_,_],
      [_,_,_,_,_,W, BK,BK,BK,BK,W, _,_,_,_,_],
      [_,_,_,_,W, BK,NB,NB,NB,NB,BK,W, _,_,_,_],
      [_,_,_,_,W, BK,NB,NB,NB,NB,BK,W, _,_,_,_],
      [_,_,_,_,W, BK,EW,NB,NB,EW,BK,W, _,_,_,_],
      [_,_,_,_,_,BK,NB,NB,NB,NB,BK,_,_,_,_,_],
      [_,_,_,_,_,W, BK,NB,NB,BK,W, _,_,_,_,_],
      [_,_,_,_,W, P, P2,P, P, P2,P, W, _,_,_,_],
      [_,_,_,W, P, P2,P, BK,BK,P, P2,P, W, _,_,_],
      [_,_,_,W, P, P2,BK,P, P, BK,P2,P, W, _,_,_],
      [_,_,_,_,W, P, P2,P, P, P2,P, W, _,_,_,_],
      [_,_,_,_,_,W, P, P2,P2,P, W, _,_,_,_,_],
      [_,_,_,_,_,_,W, W, W, W, _,_,_,_,_,_],
      [_,_,_,_,_,BK,OB,BK,BK,OB,BK,_,_,_,_,_],
      [_,_,_,S, _,BK,OB,_,_,OB,BK,_,S, _,_,_],
      [_,_,S, P, S, _,_,S, S, _,_,S, P, S, _,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Vault Keeper — brown hooded robe, gold sack, hunched, coins falling
  function vaultKeeper(ctx, x, y, size) {
    const GO = C.gold;
    const BG = C.brightGold;
    const GD = C.goldDark;
    const GP = C.goldDeep;
    const BR = C.medBrown;
    const LB = C.lightBrown;
    const DB = C.darkBrown;
    const WK = C.woodDark;
    const SK = C.skinDark;
    const SS = C.skinShadow;
    const BK = C.black;
    const data = [
      [_,_,_,_,_,DB,BR,BR,BR,BR,DB,_,_,_,_,_],
      [_,_,_,_,DB,BR,LB,BR,BR,LB,BR,DB,_,_,_,_],
      [_,_,_,_,DB,BR,LB,LB,LB,LB,BR,DB,_,_,_,_],
      [_,_,_,_,DB,BK,BK,BK,BK,BK,BK,DB,_,_,_,_],
      [_,_,_,_,_,SK,BK,SK,SK,BK,SK,_,_,_,_,_],
      [_,_,_,_,_,SS,SK,SK,SK,SK,SS,_,_,_,_,_],
      [_,_,_,_,_,_,SS,SK,SK,SS,_,_,_,_,_,_],
      [_,_,_,_,DB,BR,BR,BR,BR,BR,BR,DB,GP,GD,_,_],
      [_,_,_,DB,BR,LB,BR,DB,DB,BR,LB,GP,GD,GO,_,_],
      [_,_,_,DB,BR,LB,BR,DB,DB,BR,LB,GP,GO,BG,_,_],
      [_,_,_,DB,BR,BR,BR,DB,DB,BR,BR,DB,GD,GO,BG,_],
      [_,_,_,_,DB,BR,LB,BR,BR,LB,BR,DB,_,GO,_,_],
      [_,_,_,_,_,DB,BR,BR,BR,BR,DB,_,_,_,BG,_],
      [_,_,_,_,_,DB,BR,DB,DB,BR,DB,_,_,GO,_,_],
      [_,_,_,_,_,WK,DB,WK,WK,DB,WK,_,_,_,_,_],
      [_,_,_,_,WK,DB,WK,_,_,WK,DB,WK,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // ============================================================
  // BUILDINGS
  // ============================================================

  // building1 — Small cottage: stone base, wooden upper, thatched roof, window, door
  function building1(ctx, x, y, size) {
    const TD = C.thatchDark;
    const TM = C.thatch;
    const TL = C.thatchLight;
    const WD = C.wood;
    const WL = C.woodLight;
    const WK = C.woodDark;
    const WG = C.woodGrain;
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const SW = C.stoneWarm;
    const BK = C.black;
    const YW = C.warmYellow;
    const TG = C.torchGlow;
    const data = [
      [_,_,_,_,_,TD,TD,TD,TD,TD,TD,_,_,_,_,_],
      [_,_,_,_,TD,TM,TL,TM,TM,TL,TM,TD,_,_,_,_],
      [_,_,_,TD,TM,TL,TM,TD,TD,TM,TL,TM,TD,_,_,_],
      [_,_,TD,TM,TL,TM,TD,TM,TM,TD,TM,TL,TM,TD,_,_],
      [_,TD,TM,TD,TM,TD,TM,TL,TL,TM,TD,TM,TD,TM,TD,_],
      [WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK],
      [WD,WG,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WG,WD,WD,WD],
      [WD,WD,WD,BK,BK,BK,BK,WD,WD,WD,WD,WD,WD,WD,WD,WD],
      [WD,WG,WD,BK,YW,TG,BK,WD,WG,WD,WD,WG,WD,WD,WG,WD],
      [WD,WD,WD,BK,BK,BK,BK,WD,WD,WD,WD,WD,WD,WD,WD,WD],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,SL,ST,SW,ST,ST,WK,WD,WD,WK,ST,ST,SW,ST,SL,ST],
      [ST,ST,SW,ST,SL,ST,WD,WG,WG,WD,ST,SL,ST,SW,ST,ST],
      [SD,ST,ST,SL,ST,ST,WD,WK,WK,WD,ST,ST,SL,ST,ST,SD],
      [ST,SW,ST,ST,SD,SD,WD,WK,WK,WD,SD,SD,ST,ST,SW,ST],
      [SD,SD,SD,SD,SD,SD,WK,WK,WK,WK,SD,SD,SD,SD,SD,SD],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // building2 — Two-story house: stone walls, two windows, shingled roof, chimney
  function building2(ctx, x, y, size) {
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const SW = C.stoneWarm;
    const WD = C.wood;
    const WK = C.woodDark;
    const WG = C.woodGrain;
    const BK = C.black;
    const YW = C.warmYellow;
    const TG = C.torchGlow;
    const GR = C.medGray;
    const GL = C.lightGray;
    const GD = C.darkGray;
    const data = [
      [_,_,_,_,_,_,_,_,_,_,_,_,_,GD,GR,_],
      [_,_,_,GD,GD,GD,GD,GD,GD,GD,GD,GD,GD,GD,GR,GL],
      [_,_,GD,GR,GL,GR,GD,GR,GL,GR,GD,GR,GL,GR,GD,_],
      [_,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,GD],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,SL,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,SL,ST,ST],
      [ST,ST,SW,BK,YW,BK,ST,ST,SW,BK,YW,BK,ST,ST,SW,ST],
      [ST,SL,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,SL,ST,ST],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,ST,SW,ST,SL,ST,ST,ST,ST,ST,SL,ST,SW,ST,ST,ST],
      [ST,SL,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,SL,ST,ST],
      [SD,ST,SW,BK,TG,BK,ST,ST,SW,BK,TG,BK,ST,ST,SD,ST],
      [ST,SL,ST,BK,BK,BK,WK,WD,WD,WK,BK,BK,ST,SL,ST,ST],
      [ST,ST,SW,ST,ST,ST,WD,WG,WG,WD,ST,ST,SW,ST,ST,ST],
      [SD,SD,SD,SD,SD,SD,WD,WK,WK,WD,SD,SD,SD,SD,SD,SD],
      [SD,SD,SD,SD,SD,SD,WK,WK,WK,WK,SD,SD,SD,SD,SD,SD],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // building3 — Large manor: three windows, ornate door, two chimneys, detailed stone
  function building3(ctx, x, y, size) {
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const SW = C.stoneWarm;
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const BK = C.black;
    const YW = C.warmYellow;
    const TG = C.torchGlow;
    const GO = C.gold;
    const GR = C.medGray;
    const GD = C.darkGray;
    const GL = C.lightGray;
    const data = [
      [GD,GR,_,_,_,_,_,_,_,_,_,_,_,_,GD,GR],
      [GD,GR,GL,GD,GD,GD,GD,GD,GD,GD,GD,GD,GD,GL,GD,GR],
      [_,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,GD,GR,_],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,SL,BK,BK,BK,ST,BK,BK,BK,ST,BK,BK,BK,SL,ST,ST],
      [ST,SW,BK,YW,BK,SW,BK,YW,BK,SW,BK,YW,BK,SW,ST,ST],
      [ST,SL,BK,BK,BK,ST,BK,BK,BK,ST,BK,BK,BK,SL,ST,ST],
      [SD,ST,SW,ST,SL,SD,ST,SW,ST,SD,SL,ST,SW,ST,SD,ST],
      [ST,SL,ST,SW,ST,ST,SL,ST,SL,ST,ST,SW,ST,SL,ST,ST],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,SL,ST,SW,ST,WK,WD,GO,GO,WD,WK,ST,SW,ST,SL,ST],
      [ST,ST,SW,ST,SL,WK,WD,GO,GO,WD,WK,SL,ST,SW,ST,ST],
      [SD,ST,ST,SL,ST,WD,WK,TG,TG,WK,WD,ST,SL,ST,ST,SD],
      [ST,SW,ST,ST,SD,WD,WK,TG,TG,WK,WD,SD,ST,ST,SW,ST],
      [SD,SD,SD,SD,SD,WD,WK,TG,TG,WK,WD,SD,SD,SD,SD,SD],
      [SD,SD,SD,SD,SD,WK,WK,WK,WK,WK,WK,SD,SD,SD,SD,SD],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Pub / Tavern — hanging sign, warm glow windows, barrel, wider feel
  function pub(ctx, x, y, size) {
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const SW = C.stoneWarm;
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const WG = C.woodGrain;
    const BK = C.black;
    const YW = C.warmYellow;
    const TG = C.torchGlow;
    const OR = C.orange;
    const AM = C.amber;
    const BR = C.medBrown;
    const DB = C.darkBrown;
    const data = [
      [_,_,_,WK,WK,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,WK,WD,WL,WK,_,_,_,_,_,_,_,_,_],
      [_,_,_,WK,WL,OR,WK,_,_,_,_,_,_,_,_,_],
      [_,_,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,_,_],
      [_,WK,WD,WG,WD,WD,WG,WD,WD,WG,WD,WD,WG,WD,WK,_],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,SL,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,SL,ST,ST],
      [ST,SW,ST,BK,AM,TG,BK,ST,SW,BK,AM,TG,BK,SW,ST,ST],
      [ST,SL,ST,BK,TG,AM,BK,SW,ST,BK,TG,AM,BK,SL,ST,ST],
      [ST,ST,SW,BK,BK,BK,ST,ST,SW,BK,BK,BK,ST,ST,SW,ST],
      [SD,ST,SL,ST,SW,ST,WK,WD,WD,WK,ST,SW,ST,SL,ST,SD],
      [ST,SW,ST,SL,ST,ST,WD,TG,TG,WD,ST,ST,SL,ST,SW,ST],
      [SD,ST,SW,ST,ST,ST,WD,WK,WK,WD,ST,ST,ST,SW,ST,SD],
      [ST,SL,ST,ST,SD,SD,WD,WK,WK,WD,SD,SD,DB,BR,DB,ST],
      [SD,SD,SD,SD,SD,SD,WK,WK,WK,WK,SD,SD,BR,DB,BR,SD],
      [SD,SD,SD,SD,SD,SD,WK,WK,WK,WK,SD,SD,DB,BR,DB,SD],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Shop / Market stall — striped red/white awning, wooden counter, items displayed
  function shop(ctx, x, y, size) {
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const WG = C.woodGrain;
    const AR = C.awningRed;
    const AW = C.awningWhite;
    const AD = C.awningRedDark;
    const BK = C.black;
    const OR = C.orange;
    const GO = C.gold;
    const GD = C.goldDark;
    const GR = C.medGray;
    const GL = C.lightGray;
    const TG = C.torchGlow;
    const PG = C.plagueGreen;
    const data = [
      [_,_,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,_,_],
      [_,WK,AR,AW,AR,AW,AR,AW,AR,AW,AR,AW,AR,AW,WK,_],
      [_,WK,AD,AR,AD,AR,AD,AR,AD,AR,AD,AR,AD,AR,WK,_],
      [WK,AR,AW,AR,AW,AR,AW,AR,AW,AR,AW,AR,AW,AR,AW,WK],
      [WK,AD,AR,AD,AR,AD,AR,AD,AR,AD,AR,AD,AR,AD,AR,WK],
      [WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK],
      [WD,WG,WD,WD,WG,WD,WD,WG,WD,WD,WG,WD,WD,WG,WD,WD],
      [WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD],
      [WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK],
      [WD,WL,WD,WD,WL,WD,WD,WL,WD,WD,WL,WD,WD,WL,WD,WD],
      [_,_,GR,GL,GR,_,GO,PG,GO,_,TG,OR,GL,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [WD,WG,WD,WD,WG,WD,WD,WG,WD,WD,WG,WD,WD,WG,WD,WD],
      [WD,WD,WL,WD,WD,WD,WL,WD,WD,WL,WD,WD,WD,WL,WD,WD],
      [WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK],
      [WK,WG,WK,WK,WG,WK,WK,WG,WK,WK,WG,WK,WK,WG,WK,WK],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Town Center — grand building, banner/flag, columns, ornate entrance
  function townCenter(ctx, x, y, size) {
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const SW = C.stoneWarm;
    const WD = C.wood;
    const WK = C.woodDark;
    const BK = C.black;
    const YW = C.warmYellow;
    const TG = C.torchGlow;
    const GO = C.gold;
    const BG = C.brightGold;
    const GD = C.goldDark;
    const R  = C.bannerRed;
    const RD = C.bannerRedDark;
    const GL = C.lightGray;
    const PG = C.paleGray;
    const data = [
      [_,_,_,_,_,_,_,GO,BG,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,R, GO,R, RD,_,_,_,_,_,_],
      [_,_,_,_,_,_,R, RD,R, RD,_,_,_,_,_,_],
      [_,_,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,_,_],
      [_,SD,SL,GL,SL,SD,SL,GL,GL,SL,SD,SL,GL,SL,SD,_],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [ST,PG,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,PG,ST,ST],
      [PG,ST,SW,BK,YW,BK,ST,ST,SW,BK,YW,BK,SW,ST,PG,ST],
      [ST,PG,ST,BK,BK,BK,ST,SW,ST,BK,BK,BK,ST,PG,ST,ST],
      [ST,ST,SW,ST,SL,ST,ST,ST,ST,ST,SL,ST,SW,ST,ST,ST],
      [SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD],
      [PG,ST,PG,ST,SL,WK,WD,GO,GO,WD,WK,SL,ST,PG,ST,PG],
      [ST,PG,ST,SL,ST,WK,GD,GO,GO,GD,WK,ST,SL,ST,PG,ST],
      [ST,ST,PG,ST,ST,WD,WK,TG,TG,WK,WD,ST,ST,PG,ST,ST],
      [SD,SD,SD,SD,SD,WD,WK,TG,TG,WK,WD,SD,SD,SD,SD,SD],
      [SD,SD,SD,SD,SD,WK,WK,WK,WK,WK,WK,SD,SD,SD,SD,SD],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // ============================================================
  // TILES
  // ============================================================

  // Road — cobblestone with irregular stones, dark mortar, color variation
  function road(ctx, x, y, size) {
    const C1 = C.cobble1;
    const C2 = C.cobble2;
    const C3 = C.cobble3;
    const CL = C.cobbleLight;
    const MR = C.mortar;
    const ML = C.mortarLight;
    const SD = C.stoneDark;
    const data = [
      [C2,C1,C3,MR,C1,C2,C1,MR,C3,C1,C2,MR,C1,C3,C2,C1],
      [C1,C3,C1,MR,C2,C1,C3,MR,C1,CL,C1,MR,C2,C1,C1,C3],
      [MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,ML,MR,MR],
      [C3,C1,C2,C1,MR,C1,C3,C2,C1,MR,C3,C1,C2,C1,MR,C1],
      [C1,C2,C1,C3,MR,C2,C1,CL,C3,MR,C1,C2,C1,C3,MR,C2],
      [C2,CL,C3,C1,MR,C1,C2,C1,C1,MR,C2,C3,CL,C1,MR,C1],
      [MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,MR,ML],
      [C1,C2,C3,MR,C2,C1,C3,C1,MR,C1,C3,C2,MR,C1,C2,C3],
      [C3,C1,C1,MR,C1,CL,C1,C2,MR,C3,C1,C1,MR,C2,C1,C1],
      [C1,C3,C2,MR,C3,C1,C2,C3,MR,C1,C2,C3,MR,C1,CL,C2],
      [MR,ML,MR,MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR],
      [C2,C1,C3,C1,MR,C2,C1,CL,MR,C3,C1,C2,C1,MR,C1,C3],
      [C1,C3,C1,C2,MR,C1,C3,C1,MR,C1,C2,C1,C3,MR,C3,C1],
      [C3,C1,C2,C3,MR,C3,C1,C2,MR,C2,CL,C3,C1,MR,C1,C2],
      [MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,ML,MR],
      [C1,C2,C1,MR,C3,C1,C2,C1,MR,C1,C3,MR,C2,C1,C3,C1],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Grass — varying shades, occasional tiny flower or dirt spec
  function grass(ctx, x, y, size) {
    const G1 = C.grassDark;
    const G2 = C.grassMed;
    const G3 = C.grassLight;
    const G4 = C.grassBright;
    const DD = C.dirtDark;
    const FR = C.flowerRed;
    const FY = C.flowerYellow;
    const MG = C.mossGreen;
    const data = [
      [G1,G2,G1,G2,G3,G1,G2,G1,G2,G1,G3,G2,G1,G1,G2,G1],
      [G2,G1,G3,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G3,G1,G2],
      [G1,G3,G4,G2,G1,G2,G3,G1,G1,G1,G2,G3,G1,G1,G2,G1],
      [G2,G1,G1,G2,G1,G3,G2,G1,G2,G1,G1,G1,G2,DD,G1,G2],
      [G1,G2,G1,G3,G1,G1,G1,G2,G1,G3,G1,G2,G1,G1,G2,G1],
      [G3,G1,G2,G1,DD,G1,G2,G1,G1,G2,G1,G3,G1,G2,G1,G3],
      [G2,G1,G2,G1,G1,G2,G3,G1,G2,G1,G1,G1,MG,G1,G2,G1],
      [G1,G2,G1,G3,G2,G1,G1,G2,G1,FR,G2,G1,G1,G2,G1,G2],
      [G1,G2,G1,G1,G1,G1,G2,G1,G3,G1,G1,G2,G1,G1,G3,G2],
      [G2,G1,G3,MG,G1,G2,G1,G1,G2,G1,G4,G1,G1,G2,G1,G1],
      [G1,G2,G1,G2,G1,G2,G3,G1,G1,G1,G3,G1,G2,G1,G1,G2],
      [G3,G1,G2,G1,G2,G1,G1,G2,G1,G2,G1,G3,G1,G2,G1,G2],
      [G2,G1,G1,G3,G1,G1,G2,G1,G2,G1,G1,G2,G1,DD,G2,G1],
      [G1,FY,G2,G1,DD,G1,G1,G3,G2,G1,G2,G1,G2,G1,G1,G3],
      [G1,G2,G1,G2,G1,G3,G2,G1,G1,G2,G1,G1,G3,G2,G1,G2],
      [G2,G1,G3,G1,G2,G1,G1,G2,G1,G1,G3,G2,G1,G1,G2,G1],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Wall — thick stone brick pattern with mortar, moss on some, darker at base
  function wall(ctx, x, y, size) {
    const S1 = C.darkGray;
    const S2 = C.medGray;
    const S3 = C.lightGray;
    const MR = C.mortar;
    const ML = C.mortarLight;
    const MS = C.mossGreen;
    const data = [
      [S2,S3,S2,MR,S2,S1,S2,S3,MR,S1,S2,S3,MR,S2,S1,S2],
      [S1,S2,S1,MR,S1,S2,S1,S2,MR,S2,S1,S2,MR,S1,S2,S1],
      [MR,ML,MR,MR,MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR],
      [S2,S1,S2,S2,MR,S2,S3,S2,S2,MR,S2,S2,S1,S2,MR,S2],
      [S2,S2,S1,S2,MR,S1,S2,S1,S2,MR,S1,S2,S2,S1,MR,S1],
      [MR,MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,MR],
      [S1,S2,S3,MR,S2,S2,S1,S2,MR,S2,S1,S2,S3,MR,S2,S1],
      [S2,S1,S2,MR,S1,MS,S2,S1,MR,S1,S2,S1,S2,MR,S1,S2],
      [MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,MR,ML,MR,MR,MR,MR],
      [S2,S2,S1,S2,MR,S2,S1,S2,S2,MR,S2,S2,S1,S2,MR,S2],
      [S1,S2,S2,S1,MR,S1,S2,S1,S2,MR,S1,MS,S2,S1,MR,S1],
      [MR,MR,MR,MR,MR,ML,MR,MR,MR,MR,MR,MR,MR,MR,MR,ML],
      [S1,S1,S2,MR,S1,S2,S2,S1,MR,S2,S1,S2,MR,S1,S2,S1],
      [S1,S2,S1,MR,S1,S1,S1,S2,MR,S1,S2,S1,MR,S1,S1,S2],
      [MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR,MR],
      [S1,S1,S2,S1,MR,S1,S1,S2,S1,MR,S1,S1,S1,S2,MR,S1],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Door — ornate wooden double door in stone frame
  function door(ctx, x, y, size) {
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const WG = C.woodGrain;
    const IR = C.metalMed;
    const ID = C.metalDark;
    const IS = C.metalShine;
    const BK = C.black;
    const ST = C.stoneMed;
    const SD = C.stoneDark;
    const SL = C.stoneLight;
    const data = [
      [ST,ST,SL,ST,SD,SD,SD,SD,SD,SD,SD,SD,ST,SL,ST,ST],
      [ST,SL,ST,SD,WK,WK,WK,WK,WK,WK,WK,WK,SD,ST,SL,ST],
      [ST,ST,SD,WK,WD,WG,WD,WK,WK,WD,WG,WD,WK,SD,ST,ST],
      [ST,SL,SD,WD,WG,WD,WL,WK,WK,WL,WD,WG,WD,SD,SL,ST],
      [ST,ST,SD,WD,WD,WL,WD,WK,WK,WD,WL,WD,WD,SD,ST,ST],
      [ST,SL,SD,WD,WG,WD,WD,WK,WK,WD,WD,WG,WD,SD,SL,ST],
      [ST,ST,SD,WD,WD,WD,WL,WK,WK,WL,WD,WD,WD,SD,ST,ST],
      [ST,SL,SD,WD,WG,WD,WD,WK,WK,WD,WD,WG,WD,SD,SL,ST],
      [ST,ST,SD,WD,WD,WD,WD,WK,WK,WD,WD,WD,WD,SD,ST,ST],
      [ST,SL,SD,WD,WG,ID,IR,WK,WK,IR,ID,WG,WD,SD,SL,ST],
      [ST,ST,SD,WD,WD,WD,WD,WK,WK,WD,WD,WD,WD,SD,ST,ST],
      [ST,SL,SD,WD,WG,WL,WD,WK,WK,WD,WL,WG,WD,SD,SL,ST],
      [ST,ST,SD,WD,WD,WD,WD,WK,WK,WD,WD,WD,WD,SD,ST,ST],
      [ST,SL,SD,WD,WG,WD,WL,WK,WK,WL,WD,WG,WD,SD,SL,ST],
      [ST,ST,SD,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,SD,ST,ST],
      [ST,SL,ST,SD,SD,SD,SD,SD,SD,SD,SD,SD,SD,ST,SL,ST],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // ============================================================
  // ITEMS
  // ============================================================

  // Trap — subtle metal spikes barely visible, embedded in ground
  function trap(ctx, x, y, size) {
    const G1 = C.grassDark;
    const G2 = C.grassMed;
    const G3 = C.grassLight;
    const SP = C.metalDark;
    const SM = C.metalMed;
    const SL = C.metalLight;
    const data = [
      [G1,G2,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2,G1],
      [G2,G1,G1,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2],
      [G1,G1,G2,G1,G1,G2,G1,G1,G1,G1,G2,G1,G1,G2,G1,G1],
      [G2,G1,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2,G1],
      [G1,G2,G1,G1,SP,G1,G1,SP,G1,G1,SP,G1,G1,G2,G1,G1],
      [G1,G1,G2,SP,SM,SP,SP,SM,SP,SP,SM,SP,G2,G1,G1,G2],
      [G2,G1,SP,SM,SL,SM,SM,SL,SM,SM,SL,SM,SP,G1,G2,G1],
      [G1,G2,SP,SM,SL,SM,SM,SL,SM,SM,SL,SM,SP,G2,G1,G2],
      [G2,G1,SP,SM,SL,SM,SM,SL,SM,SM,SL,SM,SP,G1,G2,G1],
      [G1,G2,SP,SM,SL,SM,SM,SL,SM,SM,SL,SM,SP,G2,G1,G2],
      [G2,G1,G1,SP,SM,SP,SP,SM,SP,SP,SM,SP,G1,G1,G2,G1],
      [G1,G2,G1,G1,SP,G1,G1,SP,G1,G1,SP,G1,G1,G2,G1,G2],
      [G2,G1,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2,G1],
      [G1,G1,G2,G1,G1,G2,G1,G1,G1,G1,G2,G1,G1,G2,G1,G1],
      [G2,G1,G1,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2],
      [G1,G2,G1,G2,G1,G1,G2,G1,G2,G1,G1,G2,G1,G1,G2,G1],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Handcart — wooden cart with wheel, produce visible
  function handcart(ctx, x, y, size) {
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const WG = C.woodGrain;
    const GR = C.medGray;
    const GL = C.lightGray;
    const GD = C.darkGray;
    const OR = C.orange;
    const AM = C.amber;
    const PG = C.plagueGreen;
    const MG = C.mutedGreen;
    const data = [
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,WK,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,WK,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,_,_],
      [_,_,_,_,WD,WG,WD,WD,WG,WD,WD,WG,WD,WK,_,_],
      [_,_,_,_,WD,OR,AM,PG,MG,OR,AM,PG,WD,WK,_,_],
      [_,_,_,_,WD,AM,OR,MG,PG,AM,OR,MG,WD,WK,_,_],
      [_,_,_,_,WD,WG,WD,WL,WD,WG,WD,WL,WD,WK,_,_],
      [_,_,_,_,WD,WD,WL,WD,WG,WD,WL,WD,WD,WK,_,_],
      [_,_,_,_,WD,WG,WD,WD,WD,WG,WD,WD,WD,WK,_,_],
      [_,_,_,_,WK,WK,WK,WK,WK,WK,WK,WK,WK,WK,_,_],
      [_,_,_,_,_,_,GD,GR,GL,_,GD,GR,GL,_,_,_],
      [_,_,_,_,_,GD,GR,GL,GD,GD,GR,GL,GD,_,_,_],
      [_,_,_,_,_,_,GD,GR,GL,_,GD,GR,GL,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Virus — glowing green orb with corona/bubbling effect
  function virus(ctx, x, y, size) {
    const G1 = C.plagueGreen;
    const G2 = C.glowGreen;
    const G3 = C.toxicGreen;
    const G4 = C.darkGreen;
    const GM = C.glowGreenMed;
    const GP = C.deepGreen;
    const VG = C.vialGlow;
    const BK = C.black;
    const data = [
      [_,_,_,_,_,_,_,GP,GP,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,GP,G1,G1,GP,_,_,_,_,_,_],
      [_,_,_,_,GP,GP,_,GP,GP,_,GP,GP,_,_,_,_],
      [_,_,_,GP,G1,_,G1,G4,G4,G1,_,G1,GP,_,_,_],
      [_,_,GP,G1,_,G1,G3,GM,GM,G3,G1,_,G1,GP,_,_],
      [_,_,_,_,G1,G3,G2,G3,G3,G2,G3,G1,_,_,_,_],
      [_,GP,_,G1,G3,G2,VG,G2,G2,VG,G2,G3,G1,_,GP,_],
      [GP,G1,GP,G4,GM,G3,G2,VG,VG,G2,G3,GM,G4,GP,G1,GP],
      [GP,G1,GP,G4,GM,G3,G2,VG,VG,G2,G3,GM,G4,GP,G1,GP],
      [_,GP,_,G1,G3,G2,VG,G2,G2,VG,G2,G3,G1,_,GP,_],
      [_,_,_,_,G1,G3,G2,G3,G3,G2,G3,G1,_,_,_,_],
      [_,_,GP,G1,_,G1,G3,GM,GM,G3,G1,_,G1,GP,_,_],
      [_,_,_,GP,G1,_,G1,G4,G4,G1,_,G1,GP,_,_,_],
      [_,_,_,_,GP,GP,_,GP,GP,_,GP,GP,_,_,_,_],
      [_,_,_,_,_,_,GP,G1,G1,GP,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,GP,GP,_,_,_,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Plague Pill — small two-tone green capsule with highlight
  function plaguePill(ctx, x, y, size) {
    const G1 = C.plagueGreen;
    const G2 = C.mutedGreen;
    const G3 = C.paleGreen;
    const GW = C.glowGreen;
    const GM = C.glowGreenMed;
    const GD = C.darkGreen;
    const GP = C.deepGreen;
    const BK = C.black;
    const data = [
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,BK,BK,BK,BK,_,_,_,_,_,_],
      [_,_,_,_,_,BK,G1,G1,G2,G2,BK,_,_,_,_,_],
      [_,_,_,_,BK,G1,GM,G1,G2,G3,G2,BK,_,_,_,_],
      [_,_,_,_,BK,G1,GW,GM,G3,G3,G2,BK,_,_,_,_],
      [_,_,_,_,BK,G1,GM,G1,G2,G3,G2,BK,_,_,_,_],
      [_,_,_,_,BK,GD,G1,G1,G2,G2,G3,BK,_,_,_,_],
      [_,_,_,_,_,BK,GP,GD,G1,G2,BK,_,_,_,_,_],
      [_,_,_,_,_,_,BK,BK,BK,BK,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // Horse Cart — brown horse with mane, wooden cart with wheels, canvas cover
  function horseCart(ctx, x, y, size) {
    const BR = C.medBrown;
    const DB = C.darkBrown;
    const LB = C.lightBrown;
    const PB = C.paleBrown;
    const WD = C.wood;
    const WK = C.woodDark;
    const WL = C.woodLight;
    const WG = C.woodGrain;
    const GR = C.medGray;
    const GL = C.lightGray;
    const GD = C.darkGray;
    const BK = C.black;
    const CL = C.clothTan;
    const CD = C.clothDark;
    const data = [
      [_,_,_,BR,DB,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,BR,DB,LB,BR,_,_,_,_,_,CL,CD,CL,_,_],
      [_,BR,DB,BR,BR,DB,BR,_,_,_,CL,CD,CL,CD,CL,_],
      [_,BR,DB,BK,BR,LB,BR,_,_,CL,CD,CL,CD,CL,CD,_],
      [_,_,BR,DB,BR,LB,DB,BR,_,_,CL,CD,CL,CD,CL,_],
      [_,_,_,BR,DB,BR,LB,DB,BR,_,_,CL,CD,CL,_,_],
      [_,_,_,_,BR,DB,BR,DB,BR,WK,WK,WK,WK,WK,WK,_],
      [_,_,_,_,_,BR,DB,LB,BR,WD,WG,WD,WL,WD,WK,_],
      [_,_,_,_,_,_,BR,_,_,WD,WD,WL,WD,WG,WK,_],
      [_,_,_,_,_,BR,_,BR,_,WD,WG,WD,WL,WD,WK,_],
      [_,_,_,_,BR,_,_,_,BR,WK,WK,WK,WK,WK,WK,_],
      [_,_,_,_,_,_,_,_,_,_,GD,GR,GL,GD,GR,GL],
      [_,_,_,_,_,_,_,_,_,GD,GR,GL,GD,GR,GL,GD],
      [_,_,_,_,_,_,_,_,_,_,GD,GR,GL,GD,GR,GL],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];
    drawPixelArt(ctx, x, y, size, data);
  }

  // ============================================================
  // EFFECTS
  // ============================================================

  // Fog — layered darkness with dithering pattern
  function fog(ctx, x, y, size) {
    const p = size / 16;
    // Base fog layer
    ctx.fillStyle = 'rgba(10, 8, 20, 0.50)';
    ctx.fillRect(x, y, size, size);
    // Dithered mid layer — checkerboard-ish pattern for natural look
    ctx.fillStyle = 'rgba(20, 15, 40, 0.25)';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if ((r + c) % 3 === 0 || (r * 5 + c * 3) % 7 === 0) {
          ctx.fillRect(
            Math.floor(x + c * p),
            Math.floor(y + r * p),
            Math.ceil(p),
            Math.ceil(p)
          );
        }
      }
    }
    // Wisps — sparse darker patches
    ctx.fillStyle = 'rgba(5, 0, 15, 0.30)';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if ((r * 7 + c * 3) % 13 === 0 || (r * 11 + c * 5) % 17 === 0) {
          ctx.fillRect(
            Math.floor(x + c * p),
            Math.floor(y + r * p),
            Math.ceil(p * 2),
            Math.ceil(p)
          );
        }
      }
    }
    // Lighter wisps for depth variation
    ctx.fillStyle = 'rgba(30, 20, 50, 0.15)';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if ((r * 3 + c * 11) % 19 === 0) {
          ctx.fillRect(
            Math.floor(x + c * p),
            Math.floor(y + r * p),
            Math.ceil(p),
            Math.ceil(p * 2)
          );
        }
      }
    }
  }

  // Infected — green plague mist with swirling particles
  function infected(ctx, x, y, size) {
    const p = size / 16;
    // Green plague mist overlay
    ctx.fillStyle = 'rgba(48, 168, 48, 0.18)';
    ctx.fillRect(x, y, size, size);
    // Dithered organic pattern
    ctx.fillStyle = 'rgba(30, 120, 30, 0.15)';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if ((r + c) % 4 === 0 || (r * 3 + c * 7) % 9 === 0) {
          ctx.fillRect(
            Math.floor(x + c * p),
            Math.floor(y + r * p),
            Math.ceil(p),
            Math.ceil(p)
          );
        }
      }
    }
    // Bright plague particles
    const particles = [
      [2,3],[5,1],[8,5],[11,2],[14,7],[3,10],[7,12],[10,14],[13,9],[1,6],
      [6,8],[9,4],[12,11],[4,14],[15,3],[0,12],[8,0],[11,15],[5,7],[14,10],
    ];
    ctx.fillStyle = 'rgba(68, 255, 68, 0.45)';
    for (const [c, r] of particles) {
      ctx.fillRect(
        Math.floor(x + c * p),
        Math.floor(y + r * p),
        Math.ceil(p),
        Math.ceil(p)
      );
    }
    // Swirling dense blobs
    ctx.fillStyle = 'rgba(48, 216, 48, 0.30)';
    ctx.fillRect(Math.floor(x + 3 * p), Math.floor(y + 5 * p), Math.ceil(p * 2), Math.ceil(p * 2));
    ctx.fillRect(Math.floor(x + 10 * p), Math.floor(y + 8 * p), Math.ceil(p * 2), Math.ceil(p * 2));
    ctx.fillRect(Math.floor(x + 7 * p), Math.floor(y + 13 * p), Math.ceil(p * 2), Math.ceil(p));
    ctx.fillRect(Math.floor(x + 1 * p), Math.floor(y + 11 * p), Math.ceil(p), Math.ceil(p * 2));
    ctx.fillRect(Math.floor(x + 13 * p), Math.floor(y + 3 * p), Math.ceil(p * 2), Math.ceil(p));
  }

  // Wanted Star — golden 5-pointed star with bright center
  function wantedStar(ctx, x, y, size) {
    const GO = C.gold;
    const BG = C.brightGold;
    const GD = C.goldDark;
    const AM = C.amber;
    const BK = C.black;
    const starData = [
      [_,_,_,BK,BK,_,_,_],
      [_,_,BK,BG,BG,BK,_,_],
      [BK,BK,GO,BG,BG,GO,BK,BK],
      [BK,GD,GO,BG,BG,GO,GD,BK],
      [BK,GD,GO,BG,BG,GO,GD,BK],
      [BK,BK,GO,BG,BG,GO,BK,BK],
      [_,_,BK,AM,AM,BK,_,_],
      [_,_,_,BK,BK,_,_,_],
    ];
    const starSize = size * 0.35;
    const sx = x + size * 0.6;
    const sy = y;
    drawPixelArt(ctx, sx, sy, starSize, starData);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    // Helper
    drawPixelArt,

    // Characters
    player,
    civilian,
    watchman,
    patrol,
    gatekeeper,
    townGuard,
    nightWatch,
    vaultKeeper,

    // Buildings
    building1,
    building2,
    building3,
    pub,
    shop,
    townCenter,

    // Tiles
    road,
    grass,
    wall,
    door,

    // Items
    trap,
    handcart,
    virus,
    plaguePill,
    horseCart,

    // Effects
    fog,
    infected,
    wantedStar,
  };

})();
