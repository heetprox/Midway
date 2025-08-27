export function toFixed(num?: BigInt): string {
    if (!num) {
      return "0.00";
    }
  
    return num.toString().slice(0, -18) + "." + num.toString().slice(-18, -16);
  }
  
  export function toBigInt(num?: number): BigInt {
    if (!num) {
      return BigInt(0);
    }
  
    return BigInt(num * 10 ** 18);
  }
  
  export function toNumber(num?: BigInt): number {
    if (!num) {
      return 0;
    }
  
    return Number(toFixed(num));
  }