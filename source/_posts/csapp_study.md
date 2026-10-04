---
title: CSAPP 学习笔记
date: 2026-09-26 11:10:47
tags:
  - 技术
categories:
  - 技术
description: CSAPP 学习笔记
---

## 第一章

粗略介绍计算机系统的大致组成和运行程序的大致流程。

### 程序编译过程

预处理器根据源程序中带 `#` 的行将源程序改成另一个程序，再由编译器编译转化为汇编程序，接着经汇编器汇编转化为可重定位目标程序，最后由链接器转化为可执行目标程序（也就是 windows 下的 exe）

预处理器好理解，可以形象的认为就是把一堆 `#include` 直接粘贴过来（也能解释万能头为什么编译出来文件大了），然后再把 `#define` 全换掉。当然应该还有其他的，我不了解了。

编译器就是把每一个语句换成最基础的机器指令（似乎不该这么叫？我的意思是他功能上是机器指令的功能，但依然是汇编语言的形式），但同时又保持一定的抽象（大概是把一些机器码指令内存分配、不同机器的差异、基本操作对于操作数大小不同指令不同、基本操作可能会超过机器指令长度限制这一堆很脏的东西给封起来了），这些指令构成了汇编程序。

汇编器就是把汇编语言转为机器语言。链接器主要实现将程序与静态库动态库的拼接和一些定义在库中指令的地址引用的修正，以及合并相同类型的段（比如说 `.data` 和 `.text`，把他们从每个 `.o` 文件中抽出来并起来）。这样就形成可运行的程序了。

### 硬件组成

经典冯诺依曼。

总线（但这个好像冯没提（））：一组电子管道，负责信息传输。传输单位为字，字长看系统。

I/O 设备：系统与外界（真实世界、网络、磁盘内的东西……）连接桥梁，每个设备通过控制器/适配器与 I/O 总线相连。

主存：存储当前程序与当前程序运行所需数据的地方。更常见名字是内存。硬件实现是动态随机访问存储器（DRAM）

CPU：执行指令的引擎，其硬件部分大致可抽象为算术/逻辑运算单元（ALU）、寄存器文件和程序计数器（PC），随着发展还加入了 cache，当然还有其他部分但目前就只需要关注这些。当然还有分法是分成运算器和控制器两部分，这个不在这本书讨论的范畴。主要执行加载、存储、操作（本质做运算）、跳转（避免程序继续按 PC 执行顺序结构）四种基本操作。

这里本来应该有一个描述程序与数据流动的实例的，但感觉写一些宏观的东西没啥意思，只要学会了微观的我又应当可以拼成宏观的，那不如不写。

### cache 与存储设备的层次结构

 cache 即高速缓存，硬件实现是静态随机访问存储器（SRAM）。

产生原因大约是寄存器空间小存储快，主存空间大存储慢，但同时计算机倾向于访问临近的数据，于是有了类似分块的思想，在寄存器与主存中间放个 cache，这样既相对快又相对能存更多，从而让总性能更快。

加入 cache 后寻址过程产生的变化大概是会先在 cache 中寻址，找不到再去主存找（但应该有些细节上的修正）。

同时现代计算机往往不只一个 cache，已经可以有多层的 cache 了，这些 cache 随着空间增大访问时间会越长，访问的优先级也会越低，他们与寄存器、主存、本地二级存储（磁盘）和远程二级存储（分布式文件系统等等）构成分层式的存储结构，从上至下存储空间递增、存储与访问速度递减、访问优先级递减。

### 操作系统与它做出的三大抽象

操作系统可以认为是应用程序与硬件部分的桥梁，没了操作系统程序无法与底层硬件进行对接。其主要功能除了这个还有防止失控应用程序滥用底层硬件。

操作系统提出了三个对其功能的抽象：文件、进程与虚拟内存。

文件抽象了一切 IO 设备，他们与内存、CPU 间信息交流都是通过 IO 总线。

进程抽象了一个程序，让人以为它在独占 CPU。事实上，CPU 通过极高频的切换，在多个进程间营造了“同时运行”的假象。为了让切换后能完美还原，操作系统需要保存上下文——即 CPU 内部的寄存器组（PC、栈指针、通用寄存器）、页表、以及内核栈等数据结构。这一过程由内核代码实现（内核不是独立进程，而是共享的代码和数据集合）。在多核计算机中，多个进程程才能真正做到物理上的同时运行。

虚拟内存抽象了内存，让人以为这个程序独占整片内存。它可分为几大部分，从低地址至高地址分别为只读的代码和数据（指的是一些静态的常量，不可修改）、读写数据（静态变量可修改，分为 `.data`（已初始化）和 `.bss`（未初始化，加载时清零））、堆（从低至高存）、共享库内存、栈（从高至低存）和内核虚拟内存。这部分在学习 C 时已了解。

正是通过这三大抽象，操作系统使自身变得容易被各个程序操控。

### 网络

对于单机来说，网络是一种文件，其 IO 设备是网卡；而当研究对象变为多个计算机时，网络大致以客户端和服务器交互的形式实现。

### Amdahl 定律

最没用的定律。本质上是求一个程序一个片段优化之后对总效率的影响。形象的说就是“卡常卡瓶颈”。

## 第二章

介绍了底层如何用二进制信息保存数值信息。这一章好多数学证明啊，但感觉证明只是为了让你更相信这是对的，但我本来就认为这是对的，而且证明也仅仅是代入而已没有任何技术含量，因此一切证明略过了。~~感觉好敷衍。~~

### 整数

分为无符号整数与有符号整数。

对于加减乘，无符号整数的运算等价于模 $2^k$ 意义下整数运算，有符号整数运算等价把负数集体搬到正数上面然后在这下面算，换算过程也就是原转补的计算过程。同时需要特殊注意 $-2^k$，注意到它关于 $0$ 对称之后不在能表示的范围内，也就意味着它取反后值是自己。这个会使得补码对于减法的运算显得没那么“封闭”，如果想严谨分析的话干脆把减全换成加上取反加一得了。

对于移位，有逻辑移位和算术移位。逻辑移位左移舍最弃高位末位补 0，右移舍弃末位最高位补零；算术移位左移一致，右移舍弃末位最高位补原最高位。对于 C，统一对无符号整数使用逻辑移位，对有符号整数使用算术移位。本质上是为了让移位能完全对应乘 2 除 2（但最后并不完美，对于有符号整数，右移等价于除二**向下取整**，而直接除二取整是**向零取整**）。注意到二者左移操作上是一致的，但事实上二者在左移时对状态寄存器 OF 的修改是不一致的，原因很显然，因此需要分成两种操作。

### 浮点数

采取 IEEE 标准。

一个浮点数可由三部分确定：符号位(s)、阶码（E）、尾数（M）。即满足 $f=(-1)^s2^EM$。其在二进制上分为 `s`、`exp` 与 `frac` 三部分，一定程度上与前面三者对应。浮点数**不采取补码**，因此本质上对负数的处理和对正数的处理是一样的。对于浮点数，存在四种数：规格化的数、非规格化的数、inf 和 NAN。

对于规格化的数，阶码采取移码定义，满足 $E=exp-(2^{k-1}-1)$，其中 $k$ 表示 `exp` 所占位数，故对于 `float`，其 $k=8$，$E=exp-127$。`exp` 需留出全 1 与全 0，故对于 `float`，满足 $exp \in [1,254],E \in [-126,127]$。`double` 同理。尾数满足 $M=1+frac \times 2^{-k'}$，$k'$ 表示 `frac` 所占位数。此时本质上就是科学计数法，与十进制下不一样的在于由于首位必然是 $1$ 所以不需要存储首位。

对于非规格化的数，其 `exp` 部分全为 0，$E=2-2^{k-1}$，$M=frac \times 2^{-k'}$。注意到 $E$ 相较于规格化的数会大 1，事实上是为了使规格化的数向非规格化的数转变平滑，这样就直接等价于把较小规格化的数前面默认的 1 直接拿掉了。

 `inf` 满足 $exp=2^{k}-1,frac=0$；`NAN` 满足 $exp=2^{k}-1,frac\neq0$。之所以让 `inf` 设置为全零而 `NAN` 不是，是为了能在 `NAN` 中存储错误信息。

浮点数的运算基本方法是不太重要的，但其向偶数舍入的规则相对重要。对于一个浮点数，假如它要舍入到第 $k$ 位，我们令第 $k+1$ 位为 `G`，第 $k+2$ 位为 `R`，第 $k+3$ 位到末位的或为 `S`。考虑如下判断方式：

- 若 $G=0$，则显然小于 $0.5$，直接舍去。
- 若 $G=1,R=1$，则显然大于 $0.5$，进位。
- 若 $G=1,R=0,S=1$，则显然大于 $0.5$，进位。
- 若 $G=1,R=S=0$，则显然在中间，考虑舍入到的位，若其为 `0` 则不变，若其为 `1` 则进 1。

注意到 `R` 很多余，完全可以合并到 `S` 中，但据 AI 所说是一种加快判断的方法，不清楚。

本质上向偶数舍入就是通过随机误差消除总和对答案的影响。

### DATA LAB

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
