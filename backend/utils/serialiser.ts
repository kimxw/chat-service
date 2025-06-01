export default function serialiseBigInts(obj: any): any {
  if (typeof obj === "bigint") {
    return obj.toString();
  } else if (Array.isArray(obj)) {
    return obj.map(serialiseBigInts);
  } else if (obj instanceof Date) {
    return obj;
  } else if (typeof obj === "object" && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serialiseBigInts(value);
    }
    return result;
  } else {
    return obj;
  }
}
