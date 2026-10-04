---
title: DATA LAB
date: 2026-10-04 15:51:10
tags:
  - 技术
categories:
  - 大作业
description: data_lab
---

官方直接明说是一堆 puzzle 了。感觉挺好写，难度也不高。

![](https://cdn.luogu.com.cn/upload/image_hosting/lci0d4ty.webp)

`bitXor`：先注意到或很好用与凑。然后考虑异或就是在或完的结果里挖掉都有的部分，于是给与取个反再与上去就好了。

`tmin`：补码表示的最小数字，显然是 `1000...00`，直接 `1<<31` 结束。

`isTmax`：tmax tmin 本质没区别，取个反就一样了。注意到这集没有移位了。但你可以考虑 tmin 和 0 的特殊性，他们取相反数的结果都是他们本身，于是做 isTmin 只需要加判不是 0 就行了。

`allOddBits`：这集真的没招了啊，你确实没什么快的办法把所有奇数位与一起，但你倒是可以快速处理一个字节（datalab 限制写的数字在 $[0,256)$ 里面），那就这样取嘛，然后与起来判，做完了。

`negate`：考察如何求补码，过。

`isAsciDigit`：就是让你学会如何判一个数是否在一个区间里，这里需要的是 $[48,57]$。先减掉下界，负数直接走了；然后拆位，像数位 dp 那样写，然后做完了。

`conditional`：首先 `x` 里面东西肯定没啥用，直接 `!!` 变成 `0/1`。然后考虑如何根据一个 `0/1` 判是否取一个值，你发现直接用这个数填满所有位与上去就好了，填的时候倍增地填。难度不大但启发性是有的，好像底层对于带条件的 jump 就是对指令地址做类似东西呢？总之是可以让一切条件判断都变成数值运算了。

`isLessOrEqual`：很容易想到作差然后看有没有负号，但是会溢出。但你发现只有非负数减负数才会爆，那我先判完这一类就好了。

`logicalNeg`：要求用位运算实现 `!`。就是把所有数都整到末位就好，考虑倍增跳下去或起来，做完了。

`howManyBits`：感觉是最难的一个了。问需要多少位表示问的数。首先正负肯定同理，因此可以直接对负数取反码全变正数。接着考虑如何验证 $bit$ 位是否够，发现只要判断是否满足 $x \lt 2^{bit}$ 就行了。但你是不会做 if 的，但没关系，是否够可以压成 `0/1`，移位上去就是了。但如果每一位都判操作次数就爆了，没关系啊倍增一下就过了，不过这个是有实现难度的。

`floatScale2`、`floatFloat2Int`、`floatPower2`：封印已经解除了，模拟规则就好了。我记得这三个我都是一遍过的。

最终代码：

```cpp

//1
/* 
 * bitXor - x^y using only ~ and & 
 *   Example: bitXor(4, 5) = 1
 *   Legal ops: ~ &
 *   Max ops: 14
 *   Rating: 1
 */
int bitXor(int x, int y) {
  return (~((~x)&(~y)))&(~(x&y));
}
/* 
 * tmin - return minimum two's complement integer 
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 4
 *   Rating: 1
 */
int tmin(void) {

  return (1<<31);
}
//2
/*
 * isTmax - returns 1 if x is the maximum, two's complement number,
 *     and 0 otherwise 
 *   Legal ops: ! ~ & ^ | +
 *   Max ops: 10
 *   Rating: 1
 */
int isTmax(int x) {
  return (!((x+1)^(~x)))&(!(!(x+1)));
}
/* 
 * allOddBits - return 1 if all odd-numbered bits in word set to 1
 *   where bits are numbered from 0 (least significant) to 31 (most significant)
 *   Examples allOddBits(0xFFFFFFFD) = 0, allOddBits(0xAAAAAAAA) = 1
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 12
 *   Rating: 2
 */
int allOddBits(int x) {
  return !(((x>>24)&(x>>16)&(x>>8)&x&170)^170);
}
/* 
 * negate - return -x 
 *   Example: negate(1) = -1.
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 5
 *   Rating: 2
 */
int negate(int x) {
  return (~x)+1;
}
//3
/* 
 * isAsciiDigit - return 1 if 0x30 <= x <= 0x39 (ASCII codes for characters '0' to '9')
 *   Example: isAsciiDigit(0x35) = 1.
 *            isAsciiDigit(0x3a) = 0.
 *            isAsciiDigit(0x05) = 0.
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 15
 *   Rating: 3
 */
int isAsciiDigit(int x) {
  return (!((x&(~15))^48))
  &((!(x>>3&1))|(!(((x|1)&15)^9)));
}
/* 
 * conditional - same as x ? y : z 
 *   Example: conditional(2,4,5) = 4
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 16
 *   Rating: 3
 */
int conditional(int x, int y, int z) {
  int a;
  a=!!x;
  a|=a<<1;
  a|=a<<2;
  a|=a<<4;
  a|=a<<8;
  a|=a<<16;
  return (a&y)|((~a)&z);
}
/* 
 * isLessOrEqual - if x <= y  then return 1, else return 0 
 *   Example: isLessOrEqual(4,5) = 1.
 *   Legal ops: ! ~ & ^ | + << >>
 *   Max ops: 24
 *   Rating: 3
 */
int isLessOrEqual(int x, int y) {
  int c=((x^y)>>31)&1;
  int d=((x&(~y))>>31)&1;
  return (c&d)
  |
  (
    (!c)
    &
    (!(((y+((~x)+1))>>31)&1))
  );
}
//4
/* 
 * logicalNeg - implement the ! operator, using all of 
 *              the legal operators except !
 *   Examples: logicalNeg(3) = 0, logicalNeg(0) = 1
 *   Legal ops: ~ & ^ | + << >>
 *   Max ops: 12
 *   Rating: 4 
 */
int logicalNeg(int x) {
  x|=x>>16;
  x|=x>>8;
  x|=x>>4;
  x|=x>>2;
  x|=x>>1;
  return (~x)&1;
}
/* howManyBits - return the minimum number of bits required to represent x in
 *             two's complement
 *  Examples: howManyBits(12) = 5
 *            howManyBits(298) = 10
 *            howManyBits(-5) = 4
 *            howManyBits(0)  = 1
 *            howManyBits(-1) = 1
 *            howManyBits(0x80000000) = 32
 *  Legal ops: ! ~ & ^ | + << >>
 *  Max ops: 90
 *  Rating: 4
 */
int howManyBits(int x) {
  int y=x>>31&1;
  int ans=0;
  y|=y<<1;
  y|=y<<2;
  y|=y<<4;
  y|=y<<8;
  y|=y<<16;
  x=x^y;
  ans+=((!!(x>>(ans+15)))<<4);
  ans+=((!!(x>>(ans+7)))<<3);
  ans+=((!!(x>>(ans+3)))<<2);
  ans+=((!!(x>>(ans+1)))<<1);
  ans+=((!!(x>>(ans))));
  ans=ans+1;
  return ans;
}
//float
/* 
 * floatScale2 - Return bit-level equivalent of expression 2*f for
 *   floating point argument f.
 *   Both the argument and result are passed as unsigned int's, but
 *   they are to be interpreted as the bit-level representation of
 *   single-precision floating point values.
 *   When argument is NaN, return argument
 *   Legal ops: Any integer/unsigned operations incl. ||, &&. also if, while
 *   Max ops: 30
 *   Rating: 4
 */
unsigned floatScale2(unsigned uf) {
  unsigned S=uf>>31&1;
  unsigned E=uf>>23&((1<<8)-1);
  unsigned M=uf&((1<<23)-1);
  if(E==0){
    if(M>>22&1){
      M=(M<<1)-(1<<23);
      E=1;
    }
    else M<<=1;
  }
  else{
    if(E==((1<<8)-1));
    else{
      E++;
      if(E==((1<<8)-1))M=0;
    }
  }
  return (S<<31)|(E<<23)|M;
}
/* 
 * floatFloat2Int - Return bit-level equivalent of expression (int) f
 *   for floating point argument f.
 *   Argument is passed as unsigned int, but
 *   it is to be interpreted as the bit-level representation of a
 *   single-precision floating point value.
 *   Anything out of range (including NaN and infinity) should return
 *   0x80000000u.
 *   Legal ops: Any integer/unsigned operations incl. ||, &&. also if, while
 *   Max ops: 30
 *   Rating: 4
 */
int floatFloat2Int(unsigned uf) {
  unsigned S=uf>>31&1;
  unsigned E=uf>>23&((1<<8)-1);
  unsigned M=uf&((1<<23)-1);
  int ans;
  int i;
  if(E==(1<<8)-1)return 0x80000000u;
  if(E<127)return 0;
  E-=127;
  if(E>30)return 0x80000000u;
  ans=1<<E;
  for(i=0;i<=22;i++){
    if(22-i<E)ans|=(M>>i&1)<<(E-23+i);
  }
  if(S==1)ans=-ans;
  return ans;
}
/* 
 * floatPower2 - Return bit-level equivalent of the expression 2.0^x
 *   (2.0 raised to the power x) for any 32-bit integer x.
 *
 *   The unsigned value that is returned should have the identical bit
 *   representation as the single-precision floating-point number 2.0^x.
 *   If the result is too small to be represented as a denorm, return
 *   0. If too large, return +INF.
 * 
 *   Legal ops: Any integer/unsigned operations incl. ||, &&. Also if, while 
 *   Max ops: 30 
 *   Rating: 4
 */
unsigned floatPower2(int x) {
  int S=0;
  int E=0,M=0;
  if(x>=128){
    E=255;
    M=0;
  }
  else if(x<-126){
    M=1<<22;
    if(x<-300)return 0;
    M>>=(-127)-x;
  }
  else{
    M=0;
    E=x+127;
  }
  return S<<31|(E<<23)|M;
}

```

![](https://cdn.luogu.com.cn/upload/image_hosting/u33iz5mi.webp)
