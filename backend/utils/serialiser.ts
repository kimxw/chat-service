export default function serialiseBigInts(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(serialiseBigInts);
  } else if (typeof obj === "object" && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serialiseBigInts(value);
    }
    return result;
  } else if (typeof obj === "bigint") {
    return obj.toString();
  } else {
    return obj;
  }
}
