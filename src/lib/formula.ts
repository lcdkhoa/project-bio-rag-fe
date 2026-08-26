/**
 * Hiển thị công thức Hoá / Lí đúng ký hiệu — yêu cầu của Mục tiêu 5.
 *
 * Hai việc tách bạch:
 *
 * 1. `splitLatexSegments` — tách các đoạn LaTeX (`$...$`, `$$...$$`, `\(...\)`,
 *    `\[...\]`) để dựng bằng KaTeX.
 * 2. `prettifyChemistry` — hạ chỉ số dưới cho công thức hoá học viết phẳng
 *    (`H2SO4` -> `H₂SO₄`).
 *
 * **Đây là phép biến đổi HIỂN THỊ, không phải sửa dữ liệu.** Văn bản trong kho
 * không bị đụng tới; chỉ chuỗi sắp vẽ ra màn hình mới được đổi. Ranh giới này
 * quan trọng: đoán lại một chỉ số dưới rồi ghi ngược vào chỉ mục là bịa dữ liệu.
 *
 * Vì vậy `prettifyChemistry` cố tình *dè dặt*: nó chỉ đổi khi cả token phân tích
 * được thành các ký hiệu nguyên tố CÓ THẬT và có ít nhất một chỉ số lớn hơn 1.
 * Thà bỏ sót một công thức còn hơn biến `Câu 2` thành `Câu₂`.
 */

/** 118 ký hiệu nguyên tố. Có thật hay không được TRA BẢNG, không đoán theo hình dạng. */
const ELEMENTS = new Set(
  ("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni " +
    "Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I " +
    "Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt " +
    "Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
    "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og").split(" "),
);

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/**
 * Những từ đứng ngay trước một token thì token đó KHÔNG phải công thức.
 * `Câu 2`, `Bài 2`, `Hình 2`… — chặn nhóm nhầm lẫn hay gặp nhất.
 */
const NOT_FORMULA_AFTER = /(bài|hình|bảng|câu|chương|trang|tr\.|mục|lớp|phần)\s*$/i;

function toSubscript(digits: string): string {
  return digits.replace(/\d/g, (d) => SUBSCRIPT_DIGITS[Number(d)]);
}

/**
 * Token này có phải công thức hoá học không? Trả về `null` nếu không chắc.
 *
 * Điều kiện, phải thoả HẾT:
 * - tách trọn vẹn thành các cặp (ký hiệu, số lượng), không dư ký tự nào;
 * - mọi ký hiệu đều nằm trong bảng nguyên tố;
 * - có ít nhất một số lượng lớn hơn 1 — nếu mọi số đều là 1 thì chẳng có chỉ số
 *   nào để hạ, và đó thường là chữ thường (`NaCl`, `C`, `A1`).
 */
export function parseChemicalFormula(token: string): string | null {
  if (token.length < 2 || token.length > 20) return null;

  const pattern = /([A-Z][a-z]?)(\d*)/g;
  let consumed = 0;
  let hasRealSubscript = false;
  let out = "";

  for (const match of token.matchAll(pattern)) {
    const [whole, symbol, digits] = match;
    if (match.index !== consumed) return null; // có ký tự lạ xen vào
    consumed += whole.length;
    if (!ELEMENTS.has(symbol)) return null;
    if (digits && Number(digits) > 1) hasRealSubscript = true;
    out += symbol + toSubscript(digits);
  }

  if (consumed !== token.length) return null;
  return hasRealSubscript ? out : null;
}

/** Hạ chỉ số dưới cho mọi công thức hoá học nhận ra được trong một đoạn chữ. */
export function prettifyChemistry(text: string): string {
  return text.replace(/\b[A-Za-z][A-Za-z0-9]*\b/g, (token, offset: number) => {
    if (NOT_FORMULA_AFTER.test(text.slice(Math.max(0, offset - 12), offset))) {
      return token;
    }
    return parseChemicalFormula(token) ?? token;
  });
}

export interface TextSegment {
  kind: "text" | "math";
  value: string;
  /** Chỉ có nghĩa với `kind === "math"`: công thức nguyên khối hay nằm trong dòng. */
  display?: boolean;
}

/** Biểu thức bắt các kiểu bao công thức mà mô hình hay dùng. */
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

/**
 * Tách một đoạn chữ thành các mảnh chữ thường và mảnh công thức.
 *
 * Không có mảnh công thức nào thì trả về đúng một mảnh chữ — nên phía gọi không
 * cần rẽ nhánh riêng cho trường hợp "câu trả lời không có công thức".
 */
export function splitLatexSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, index) });
    }

    const blockBody = match[1] ?? match[2];
    const inlineBody = match[3] ?? match[4];
    segments.push({
      kind: "math",
      value: (blockBody ?? inlineBody ?? "").trim(),
      display: blockBody !== undefined,
    });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", value: text.slice(cursor) });
  }

  return segments.length ? segments : [{ kind: "text", value: text }];
}
