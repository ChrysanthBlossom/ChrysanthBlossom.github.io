---
title: XCPC 模板
date: 2026-10-31 20:34:13
tags:
  - 阴雨霉湿之地
categories:
  - 模板
description: ''
---

## 一、计算几何

纯整数版。

主要覆盖求凸包
```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.5e5+7;
const int mod=998244353;
const ll inf=1e15;
mt19937 my_rand(chrono::steady_clock::now().time_since_epoch().count());
struct Vector{
	ll x,y;
	friend Vector operator + (Vector a,Vector b){
		return (Vector){a.x+b.x,a.y+b.y};
	}
	friend Vector operator - (Vector a,Vector b){
		return (Vector){a.x-b.x,a.y-b.y};
	}
	friend ll operator * (Vector a,Vector b){
		return a.x*b.x+a.y*b.y;
	}
	friend ll operator ^ (Vector a,Vector b){
		return a.x*b.y-a.y*b.x;
	}
	friend bool operator < (Vector a,Vector b){
		if(a.x==b.x)return a.y<b.y;
		return a.x<b.x;
	}
	friend bool operator == (Vector a,Vector b){
		return a.x==b.x&&a.y==b.y;
	}
	ll get_dis_sqr(){
		return x*x+y*y;
	}
};
typedef Vector Point;
bool turn_left(Point a,Point b,Point c){
	return ((b-a)^(c-a))>0;
}
bool on_same_line(Point a,Point b,Point c){
	return ((b-a)^(c-a))==0;
}
vector<Point>get_side(vector<Point>pnt){
	vector<Point>ans;
	for(auto x:pnt){
		while(ans.size()>=2&&!turn_left(ans[ans.size()-2],ans[ans.size()-1],x))ans.pop_back();
		ans.emplace_back(x);
	}
	ans.pop_back();
	return ans;
}
vector<Point>get_convex(vector<Point>pnt){
	if(pnt.size()<=2)return pnt;
	sort(pnt.begin(),pnt.end());
	vector<Point>ans,tmp;
	tmp=get_side(pnt);
	for(auto x:tmp)ans.emplace_back(x);
	reverse(pnt.begin(),pnt.end());
	tmp=get_side(pnt);
	for(auto x:tmp)ans.emplace_back(x);
	return ans;
}
ll get_size(vector<Point>pnt){
	ll ans=0;
	for(int i=1;i<pnt.size()-1;i++)ans+=(pnt[i]-pnt[0])^(pnt[i+1]-pnt[0]);
	return abs(ans);
}
ll get_diameter(vector<Point>pnt){
	pnt=get_convex(pnt);
	int sz=pnt.size();for(int i=0;i<sz;i++)pnt.emplace_back(pnt[i]);
	ll ans=0;
	int p=0;
	for(int i=0;i<sz;i++){
		while(p<pnt.size()-1&&abs((pnt[p+1]-pnt[i])^(pnt[i+1]-pnt[i]))>=abs((pnt[p]-pnt[i])^(pnt[i+1]-pnt[i])))p++;
		ans=max(ans,(pnt[p]-pnt[i]).get_dis_sqr());
		ans=max(ans,(pnt[p]-pnt[i+1]).get_dis_sqr());
	}
	return ans;
}
Point get_bd(vector<Point>&a){
	Point ans=(Point){inf,inf};
	for(auto x:a){
		ans.x=min(ans.x,x.x);
		ans.y=min(ans.y,x.y);
	}
	return ans;
}
vector<Point>Mincovsik(vector<Point>a,vector<Point>b){
	Point mina=get_bd(a),minb=get_bd(b);
	Point minfinal=mina+minb;
	if(a.size()>1)a.emplace_back(a[0]);
	if(b.size()>1)b.emplace_back(b[0]);
	int p1=0,p2=0;
	vector<Vector>edge;
	while(p1<a.size()-1||p2<b.size()-1){
		bool chs;
		if(p1==a.size()-1)chs=1;
		else if(p2==b.size()-1)chs=0;
		else if(((a[p1+1]-a[p1])^(b[p2+1]-b[p2]))>=0)chs=0;
		else chs=1;
		if(chs==0){
			edge.emplace_back(a[p1+1]-a[p1]);
			p1++;
		}
		else{
			edge.emplace_back(b[p2+1]-b[p2]);
			p2++;
		}
	}
	vector<Point>ans;ans.emplace_back((Point){0,0});
	for(auto e:edge){
		Point p=ans.back()+e;
		while(ans.size()>=2&&on_same_line(ans[ans.size()-2],ans[ans.size()-1],p))ans.pop_back();
		ans.emplace_back(p);
	}
	ans.pop_back();
	Point now_min=get_bd(ans);
	for(auto &p:ans)p=p+minfinal-now_min;
	return ans;
}
// c on ab
bool on_segment(Point a,Point b,Point c){
	if(!on_same_line(a,b,c))return 0;
	return (((b-c)*(c-a))>=0);
}
bool in_convex(vector<Point>&convex,Point p){
	if(convex.size()==1){
		return convex[0]==p;
	}
	if(
		((p-convex[0])^(convex[1]-convex[0]))>0
		||
		((p-convex[0])^(convex.back()-convex[0]))<0
	)return 0;
	if(on_segment(convex[0],convex[1],p)||on_segment(convex[0],convex.back(),p))return 1;
	int l=1,r=convex.size()-2,ans=-1;
	while(l<=r){
		int mid=l+r>>1;
		if(((convex[mid]-convex[0])^(p-convex[0]))>=0)ans=mid,l=mid+1;
		else r=mid-1;
	}
	if(((p-convex[ans])^(convex[ans+1]-p))<=0)return 1;
	return 0;
}
```
带小数版（主要利用里面关于圆、求交点等与凸性无关的板子）

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.5e5+7;
const int mod=998244353;
const int inf=1e9;
const ld eps=1e-9;
const ld pi=3.141592653;
mt19937 my_rand(chrono::steady_clock::now().time_since_epoch().count());
int n;
bool equal(ld x,ld y){
	return (fabs(x-y)<eps?1:0);
}
int cmpdb(ld x,ld y){
	if(equal(x,y))return 0;
	if(x<y)return -1;
	return 1;
}
struct Vector{
	ld x,y;
	friend Vector operator + (Vector a,Vector b){
		return (Vector){a.x+b.x,a.y+b.y};
	}
	friend Vector operator - (Vector a,Vector b){
		return (Vector){a.x-b.x,a.y-b.y};
	}
	friend ld operator * (Vector a,Vector b){
		// point time
		return a.x*b.x+a.y*b.y;
	}
	friend ld operator ^ (Vector a,Vector b){
		// cross time
		return a.x*b.y-a.y*b.x;
	}
	friend Vector operator * (Vector a,ld b){
		return (Vector){a.x*b,a.y*b};
	}
	friend Vector operator / (Vector a,ld b){
		return (Vector){a.x/b,a.y/b};
	}
	friend bool operator < (Vector a,Vector b){
		return (equal(a.x,b.x)?a.y<b.y:a.x<b.x);
	}
	friend bool operator == (Vector a,Vector b){
		return equal(a.x,b.x)&&equal(a.y,b.y);
	}
	ld get_len(){
		return sqrtl(x*x+y*y);
	}
	Vector rotate(ld angle){
		return (Vector){x*cos(angle)+y*sin(angle),-x*sin(angle)+y*cos(angle)};
	}
	Vector rotate_lf(){
		return (Vector){-y,x};
	}
	Vector rotate_rt(){
		return (Vector){y,-x};
	}
};
ld get_vector_ang(Vector v){
	v.rotate_rt();
	return atan2(v.y,v.x);
}
typedef Vector Point;
ld get_dis(Point a,Point b){
	return (a-b).get_len();
}
Point get_mid(Point a,Point b){
	return (Point){(a.x+b.x)/2,(a.y+b.y)/2};
}
struct Circle{
	Point O;
	ld r;
	bool in_circle(Point p){
		ld d=get_dis(p,O);
		return d<r||equal(d,r);
	}
};
struct Line{
	Point p;
	Vector direction;
	friend bool on_line_left(Line ln,Point p){
		return cmpdb(ln.direction^(p-ln.p),0)>=0;
	}
	friend bool operator < (Line a,Line b){
		Vector d1=a.direction.rotate_rt(),d2=b.direction.rotate_rt();
		ld ar1=atan2(d1.y,d1.x),ar2=atan2(d2.y,d2.x);
		if(equal(ar1,ar2))return on_line_left(b,a.p);
		return ar1<ar2;
	}
};
Point get_cross(Line a,Line b){
	ld t=((b.p-a.p)^b.direction)/(a.direction^b.direction);
	return a.p+(a.direction*t);
}
ld get_dis(Point a,Point b,Point c){
	// get the dis from ab to c
	return fabs((a-c)^(b-c))/(a-b).get_len();
}
bool turn_left(Point a,Point b,Point c){
	return ((b-a)^(c-b))>0&&!equal((b-a)^(c-b),0);
}
vector<Point>get_side(vector<Point>pnt){
	vector<Point>convex;
	for(auto x:pnt){
		while(convex.size()>=2
		&&
		!turn_left(convex[convex.size()-2],convex[convex.size()-1],x)
		)convex.pop_back();
		convex.emplace_back(x);
	}
	convex.pop_back();
	return convex;
}
vector<Point>get_convex(vector<Point>pnt){
	sort(pnt.begin(),pnt.end());
	vector<Point>ans,convex;
	convex=get_side(pnt);
	for(auto x:convex)ans.emplace_back(x);
	reverse(pnt.begin(),pnt.end());
	convex=get_side(pnt);
	for(auto x:convex)ans.emplace_back(x);
	return ans;
}
ld get_diameter(vector<Point>pnt){
	vector<Point>convex=get_convex(pnt);
	int sz=convex.size();for(int i=0;i<sz;i++)convex.emplace_back(convex[i]);
	int cur=1;
	ld ans=get_dis(convex[0],convex[1])*get_dis(convex[0],convex[1]);
	for(int i=0;i<sz;i++){
		while(cur<convex.size()-1&&get_dis(convex[i],convex[i+1],convex[cur])<=get_dis(convex[i],convex[i+1],convex[cur+1]))cur++;
		ans=max(ans,get_dis(convex[cur],convex[i]));
		ans=max(ans,get_dis(convex[cur],convex[i+1]));
	}
	return ans;
}
Line get_mid_line(Point a,Point b){
	Point mid=get_mid(a,b);
	return (Line){mid,(a-b).rotate_lf()};
}
Circle get_circumcircle(Point a,Point b,Point c){
	Line midab=get_mid_line(a,b);
	Line midbc=get_mid_line(b,c);
	Point O=get_cross(midab,midbc);
	return (Circle){O,get_dis(a,O)};
}
bool on_same_line(Point a,Point b,Point c){
	return equal((b-a)^(c-b),0);
}
int on_segment(Point a,Point b,Point c){
	// c on ab
	if(!on_same_line(a,b,c))return 0;
	if(cmpdb((a-c)*(c-b),0)>0)return 1;
	if(cmpdb((a-c)*(c-b),0)==0)return 2;
	return 0;
}
Circle smallest_circle(vector<Point>pnt){
	shuffle(pnt.begin(),pnt.end(),my_rand);
	Circle ans={(Point){0,0},0};
	for(int i=0;i<pnt.size();i++){
		if(ans.in_circle(pnt[i]))continue;
		ans=(Circle){pnt[i],0};
		for(int j=0;j<i;j++){
			if(ans.in_circle(pnt[j]))continue;
			ans=(Circle){get_mid(pnt[i],pnt[j]),get_dis(pnt[i],pnt[j])/2};
			for(int k=0;k<j;k++){
				if(ans.in_circle(pnt[k]))continue;
				if(on_same_line(pnt[i],pnt[j],pnt[k])){
					if(get_dis(pnt[i],pnt[k])>get_dis(pnt[j],pnt[k]))ans=(Circle){get_mid(pnt[i],pnt[k]),get_dis(pnt[i],pnt[k])/2};
					else ans=(Circle){get_mid(pnt[k],pnt[j]),get_dis(pnt[k],pnt[j])/2};
				}
				else ans=get_circumcircle(pnt[i],pnt[j],pnt[k]);
			}
		}
	}
	return ans;
}
int in_convex(vector<Point>&convex,Point p){
	if(cmpdb((p-convex[0])^(convex[1]-convex[0]),0)>0||cmpdb((p-convex[0])^(convex.back()-convex[0]),0)<0)return 0;
	// cout<<"1\n";
	if(on_segment(convex[0],convex[1],p)||on_segment(convex[0],convex.back(),p))return 2;
	// cout<<"2\n";
	int l=1,r=convex.size()-2,ans=0;
	while(l<=r){
		int mid=l+r>>1;
		if(cmpdb((p-convex[0])^(convex[mid]-convex[0]),0)<=0)ans=mid,l=mid+1;
		else r=mid-1;
	}
	// cout<<convex[ans].x<<' '<<convex[ans].y<<endl;
	if(cmpdb((convex[ans+1]-convex[ans])^(p-convex[ans]),0)>0)return 1;
	else if(cmpdb((convex[ans+1]-convex[ans])^(p-convex[ans]),0)==0)return 2;
	return 0;
}
pair<ld,ld>get_bd(vector<Point>a){
	ld minx=inf,miny=inf;
	for(auto x:a)if(x.x<minx)minx=x.x;
	for(auto x:a)if(x.y<miny)miny=x.y;
	return mkp(minx,miny);
}
vector<Point>Minkowski(vector<Point>a,vector<Point>b){
	pair<ld,ld>mina=get_bd(a),minb=get_bd(b);
	ld minx=mina.first+minb.first,miny=mina.second+minb.second;
	a.emplace_back(a[0]),b.emplace_back(b[0]);
	vector<Point>new_convex;new_convex.emplace_back((Point){0,0});
	int p1=0,p2=0;
	while(p1!=a.size()-1||p2!=b.size()-1){
		int chs;
		if(p1==a.size()-1)chs=2;
		else if(p2==b.size()-1)chs=1;
		else if(cmpdb((a[p1+1]-a[p1])^(b[p2+1]-b[p2]),0)>=0)chs=1;
		else chs=2;
		if(chs==1){
			new_convex.emplace_back(new_convex.back()+a[p1+1]-a[p1]);
			p1++;
		}
		else{
			new_convex.emplace_back(new_convex.back()+b[p2+1]-b[p2]);
			p2++;
		}
	}
	new_convex.pop_back();
	ld real_minx=inf,real_miny=inf;
	for(auto x:new_convex){
		real_minx=min(real_minx,x.x);
		real_miny=min(real_miny,x.y);
	}
	for(auto &x:new_convex){
		x.x+=minx-real_minx;
		x.y+=miny-real_miny;
	}
	vector<Point>newnew=get_convex(new_convex);
	return newnew;
}
vector<Point>half_cross(vector<Line>ln){
	sort(ln.begin(),ln.end());
	deque<Line>ans;
	auto update=[&](Line l){
		if(ans.size()&&equal(ans.back().direction^l.direction,0))return;
		while(ans.size()>=2){
			Line x=ans.back();ans.pop_back();
			Line y=ans.back();
			if(on_line_left(l,get_cross(x,y))){
				ans.push_back(x);
				break;
			}
		}
		while(ans.size()>=2){
			Line x=ans.front();ans.pop_front();
			Line y=ans.front();
			if(on_line_left(l,get_cross(x,y))){
				ans.push_front(x);
				break;
			}
		}
		ans.emplace_back(l);
	};
	for(auto l:ln)update(l);
	update(ans[0]);
	// cout<<ans.size()<<endl;
	vector<Point>pnt;
	for(int i=0;i<ans.size()-1;i++){
		pnt.emplace_back(get_cross(ans[i],ans[i+1]));
	}
	return pnt;
}
ld get_size(vector<Point>polygon){
	ld ans=0;
	for(int i=1;i<polygon.size()-1;i++){
		ans+=(polygon[i]-polygon[0])^(polygon[i+1]-polygon[0]);
	}
	ans/=2;
	return fabs(ans);
}
pair<Point,Point>get_circle_cross(Circle a,Circle b){
	ld d=get_dis(a.O,b.O);
	Vector unit=(b.O-a.O)/d;
	ld x=(a.r*a.r-b.r*b.r+d*d)/2/d;
	ld h=sqrtl(a.r*a.r-x*x);
	return mkp(a.O+unit*x+unit.rotate_lf()*h,a.O+unit*x+unit.rotate_rt()*h);
}
pair<Point,Point>get_touch(Point p,Circle O){
	return get_circle_cross(O,(Circle){get_mid(p,O.O),get_dis(p,O.O)/2});
}
ld ans;
void update(set<Point>&st,Point p){
	auto rit=st.upper_bound(p);
	auto lit=prev(rit);
	if(cmpdb((p-(*lit))^((*rit)-(*lit)),0)>=0)return;
	while(lit!=st.begin()&&cmpdb(((*lit)-(*prev(lit)))^(p-(*lit)),0)>=0)lit--;
	while(next(rit)!=st.end()&&cmpdb(((*rit)-(*next(rit)))^(p-(*rit)),0)<=0)rit++;
	for(auto it=next(lit);prev(it)!=rit;it++){
		ans-=get_dis(*prev(it),*it);
	}
	ans+=get_dis((*lit),p);ans+=get_dis((*rit),p);
	st.erase(next(lit),rit);
	st.insert(p);
}

```

## 二、图论

### inf 种 tarjan

求点双

后续建圆方树直接将每个点双分量与点相连即可。
```cpp
void tarjan(int u,int fe){
	if(!fe&&!vec[u].size()){
		++pid;
		col[u]=pid;
		vdcc[pid].emplace_back(u);
		return;
	}
	dfn[u]=low[u]=++tim;
	st.emplace_back(u);
	for(auto e:vec[u]){
		int v=e.first,id=e.second;
		if(id==fe)continue;
		if(dfn[v]){
			low[u]=min(low[u],dfn[v]);
			continue;
		}
		tarjan(v,id);low[u]=min(low[u],low[v]);
		if(low[v]>=dfn[u]){
			++pid;
			while(st.back()!=v){
				col[st.back()]=pid;vdcc[pid].emplace_back(st.back());st.pop_back();
			}
			col[st.back()]=pid;vdcc[pid].emplace_back(st.back());st.pop_back();
			vdcc[pid].emplace_back(u);
		}
	}
}

```

求边双

后续连边给颜色不同的连单向（两边都搞就是双向了）

```cpp
void tarjan(int u,int fe,int fa){
	dfn[u]=low[u]=++tim;
	st.emplace_back(u);
	for(auto e:vec[u]){
		int v=e.first,id=e.second;
		if(id==fe)continue;
		if(dfn[v]){
			low[u]=min(low[u],dfn[v]);
			continue;
		}
		tarjan(v,id,u);low[u]=min(low[u],low[v]);
	}
	if(low[u]>dfn[fa]){
		++pid;
		while(st.back()!=u){
			edcc[pid].emplace_back(st.back());
			col[st.back()]=pid;
			st.pop_back();
		}
		edcc[pid].emplace_back(st.back());
		col[st.back()]=pid;
		st.pop_back();
	}
}
```

缩点

后续建边**需要用 `map` 避免重边**。

```cpp
void tarjan(int u){
	st.emplace_back(u);
	dfn[u]=low[u]=++tim;
	for(auto v:ed[u]){
		if(col[v])continue;
		if(dfn[v]){
			low[u]=min(low[u],dfn[v]);
			continue;
		}
		tarjan(v);low[u]=min(low[u],low[v]);
	}
	if(dfn[u]==low[u]){
		++pid;
		while(st.back()!=u){
			int x=st.back();col[x]=pid;st.pop_back();
		}
		int x=st.back();col[x]=pid;st.pop_back();
	}
}
```

### 网络流

最大流

注意 `long long` 的处理。同时注意当前弧优化与判空流 `break` 的先后顺序。

`maxn` 与 `maxm` 根据实际调整。

```cpp
namespace MaxFlow{
	const int maxn=1e5+7;
	const int maxm=1e5+7;
	int n,st,ed;
	int cnt,head[maxn],to[maxm],nxt[maxm],rl[maxm];
	void init(int nn,int sst,int eed){
		n=nn;st=sst;ed=eed;
		for(int i=1;i<=cnt;i++)to[i]=nxt[i]=rl[i]=0;
		for(int i=1;i<=n;i++)head[i]=0;
		cnt=1;
	}
	void add(int u,int v,int w){
		++cnt;
		to[cnt]=v;rl[cnt]=w;
		nxt[cnt]=head[u];
		head[u]=cnt;
	}
	void add_edge(int u,int v,int w){
		add(u,v,w);add(v,u,0);
	}
	int dis[maxn];
	const int inf=1e9;
	bool bfs(){
		for(int i=1;i<=n;i++)dis[i]=inf;
		dis[st]=0;queue<int>q;q.push(st);
		while(!q.empty()){
			int u=q.front();q.pop();
			for(int e=head[u];e;e=nxt[e]){
				int v=to[e],rll=rl[e];
				if(rll&&dis[v]>dis[u]+1){
					dis[v]=dis[u]+1;
					q.push(v);
				}
			}
		}
		return dis[ed]!=inf;
	}
	int now[maxn];
	ll dfs(int u,ll s){
		if(u==ed||s==0)return s;
		ll res=0;
		for(int e=now[u];e;e=nxt[e]){
			if(!s)break;
			now[u]=e;
			int v=to[e],rll=rl[e];
			if(rll&&dis[v]==dis[u]+1){
				ll k=dfs(v,min(s,1ll*rll));
				rl[e]-=k;rl[e^1]+=k;
				res+=k;s-=k;
			}
		}
		return res;
	}
	ll max_flow(){
		ll ans=0;
		while(bfs()){
			for(int i=1;i<=n;i++)now[i]=head[i];
			ans+=dfs(st,1e18);
		}
		return ans;
	}
}

```

费用流

整个一起推流版（原始对偶优化）

注意后面 `dfs` 里判距离直接用 `h`！！！

以及 `dfs` 中需判 `vis` 防止反向边给流推回来，然后开始转圈。

```cpp
namespace CostFlow{
	const int maxn=1e5+7;
	const int maxm=1e5+7;
	int n,st,ed;
	int cnt,head[maxn],to[maxm],nxt[maxm],rl[maxm],fy[maxm];
	const ll inf=1e18;
	void init(int nn,int sst,int eed){
		n=nn;st=sst;ed=eed;
		for(int i=1;i<=cnt;i++)to[i]=nxt[i]=rl[i]=fy[i]=0;
		for(int i=1;i<=n;i++)head[i]=0;
		cnt=1;
	}
	void add(int u,int v,int rll,int fyy){
		++cnt;
		to[cnt]=v;rl[cnt]=rll;fy[cnt]=fyy;
		nxt[cnt]=head[u];
		head[u]=cnt;
	}
	void add_edge(int u,int v,int rll,int fyy){
		add(u,v,rll,fyy);
		add(v,u,0,-fyy);
	}
	ll h[maxn],dis[maxn];
	bool inq[maxn];
	void spfa(){
		for(int i=1;i<=n;i++)dis[i]=inf,inq[i]=0;
		dis[st]=0;inq[st]=1;
		queue<int>q;q.push(st);
		while(!q.empty()){
			int u=q.front();q.pop();
			inq[u]=0;
			for(int e=head[u];e;e=nxt[e]){
				int v=to[e],rll=rl[e],fyy=fy[e];
				if(rll&&dis[u]+fyy<dis[v]){
					dis[v]=dis[u]+fyy;
					if(!inq[v]){
						inq[v]=1;q.push(v);
					}
				}
			}
		}
		for(int i=1;i<=n;i++)h[i]=dis[i];
	}
	bool dijkstra(){
		for(int i=1;i<=n;i++)dis[i]=inf;
		dis[st]=0;
		priority_queue<pair<ll,int> >q;q.push(mkp(0,st));
		while(!q.empty()){
			auto [d,u]=q.top();q.pop();
			d=-d;
			if(d!=dis[u])continue;
			for(int e=head[u];e;e=nxt[e]){
				int v=to[e],rll=rl[e],fyy=fy[e];
				if(rll&&dis[u]+h[u]+fyy<dis[v]+h[v]){
					dis[v]=dis[u]+h[u]+fyy-h[v];
					q.push(mkp(-dis[v],v));
				}
			}
		}
		for(int i=1;i<=n;i++)h[i]=min(inf,h[i]+dis[i]);
		return dis[ed]!=inf;
	}
	ll total_cost;
	bool vis[maxn];
	int now[maxn];
	int dfs(int u,int s){
		if(u==ed||s==0){
			total_cost+=s*h[u];
			return s;
		}
		int res=0;
		vis[u]=1;
		for(int e=now[u];e;e=nxt[e]){
			if(!s)break;
			int v=to[e],rll=rl[e],fyy=fy[e];
			if(!vis[v]&&rll&&h[u]+fyy==h[v]){
				int k=dfs(v,min(rll,s));
				rl[e]-=k;rl[e^1]+=k;
				res+=k;s-=k;
			}
		}
		vis[u]=0;
		return res;
	}
	pair<int,ll>cost_flow(){
		spfa();
		total_cost=0;
		int ans=0;
		while(dijkstra()){
			for(int i=1;i<=n;i++)now[i]=head[i];
			ans+=dfs(st,1e9);
		}
		return mkp(ans,total_cost);
	}
}
```

### 欧拉回路

有向图欧拉路径（字典序最小）

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const ll inf=1e15;
int n,m;
bool del[maxn];
vector<pair<int,int> >ed[maxn];
vector<int>ans;
void dfs(int u){
	while(ed[u].size()){
		if(del[ed[u].back().second]){
			ed[u].pop_back();
			continue;
		}
		auto [v,id]=ed[u].back();ed[u].pop_back();
		del[id]=1;
		dfs(v);
	}
	ans.emplace_back(u);
}
int in[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m;
	for(int i=1;i<=m;i++){
		int u,v;cin>>u>>v;
		ed[u].emplace_back(mkp(v,i));
	}
	for(int i=1;i<=n;i++){
		for(auto [v,id]:ed[i])in[v]++;
	}
	int s=-1,t=-1;
	for(int i=1;i<=n;i++){
		if(abs(in[i]-(int)ed[i].size())>1){
			cout<<"No\n";
			return 0;
		}
		else if(in[i]==ed[i].size()-1){
			if(s==-1)s=i;
			else {
				cout<<"No\n";
				return 0;
			}
		}
		else if(in[i]==ed[i].size()+1){
			if(t==-1)t=i;
			else {
				cout<<"No\n";
				return 0;
			}
		}
	}
	if(s==-1&&t==-1)s=t=1;
	if(s==-1||t==-1){
		cout<<"No\n";
		return 0;
	}
	for(int i=1;i<=n;i++){
		sort(ed[i].begin(),ed[i].end());
		reverse(ed[i].begin(),ed[i].end());
	}
	dfs(s);
	reverse(ans.begin(),ans.end());
	for(auto x:ans)cout<<x<<' ';cout<<endl;
	return 0;
}
```

无向图欧拉回路

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const ll inf=1e15;
int n,m;
bool del[maxn];
vector<pair<int,int> >ed[maxn];
vector<int>ans;
void dfs(int u){
	while(ed[u].size()){
		if(del[ed[u].back().second]){
			ed[u].pop_back();
			continue;
		}
		auto [v,id]=ed[u].back();ed[u].pop_back();
		del[id]=1;
		dfs(v);
	}
	ans.emplace_back(u);
}
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m;
	for(int i=1;i<=m;i++){
		int u,v;cin>>u>>v;
		ed[u].emplace_back(mkp(v,i));
		ed[v].emplace_back(mkp(u,i));
	}
	dfs(1);
	reverse(ans.begin(),ans.end());
	for(auto x:ans)cout<<x<<'\n';
	return 0;
}
```

### 差分约束

注意要建虚点。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const int inf=1e9;
int n,m;
vector<pair<int,int> >ed[maxn];
int dis[maxn];
int popcnt[maxn];
bool inq[maxn];
void spfa(){
	for(int i=1;i<=n+1;i++)dis[i]=inf,popcnt[i]=0,inq[i]=0;
	dis[n+1]=0;queue<int>q;q.push(n+1);inq[n+1]=1;
	while(!q.empty()){
		int u=q.front();q.pop();
		inq[u]=0;popcnt[u]++;
		if(popcnt[u]>n){
			cout<<"NO\n";
			exit(0);
		}
		for(auto [v,w]:ed[u]){
			if(dis[u]+w<dis[v]){
				dis[v]=dis[u]+w;
				if(!inq[v]){
					inq[v]=1;
					q.push(v);
				}
			}
		}
	}
}
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m;
	for(int i=1;i<=m;i++){
		int u,v,w;cin>>v>>u>>w;
		ed[u].emplace_back(mkp(v,w));
	}
	for(int i=1;i<=n;i++)ed[n+1].emplace_back(mkp(i,0));
	spfa();
	for(int i=1;i<=n;i++)cout<<dis[i]<<' ';cout<<endl;
	return 0;
}
```

### 虚树

谨慎清空，外面与 `Graph` 的 `namespace` 里面都要。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const ll inf=1e15;
int n,m;
vector<pair<int,int> >ed[maxn];
int dep[maxn];
int mini[maxn][26];
int f[maxn][26];
int dfn[maxn],tot;
void dfs(int u,int fa){
	dfn[u]=++tot;
	dep[u]=dep[fa]+1;
	for(auto [v,w]:ed[u]){
		if(v==fa)continue;
		f[v][0]=u;
		for(int i=1;i<=20;i++)f[v][i]=f[f[v][i-1]][i-1];
		mini[v][0]=w;
		for(int i=1;i<=20;i++)mini[v][i]=min(mini[v][i-1],mini[f[v][i-1]][i-1]);
		dfs(v,u);
	}
}
int get_weight(int u,int anc){
	int ans=1e9;
	for(int i=20;i>=0;i--)if(dep[f[u][i]]>=dep[anc])ans=min(ans,mini[u][i]),u=f[u][i];
	return ans;
}
int get_lca(int a,int b){
	if(dep[a]<dep[b])swap(a,b);
	for(int i=20;i>=0;i--)if(dep[f[a][i]]>=dep[b])a=f[a][i];
	if(a==b)return a;
	for(int i=20;i>=0;i--)if(f[a][i]!=f[b][i])a=f[a][i],b=f[b][i];
	return f[a][0];
}
namespace Graph{
	int n;
	vector<pair<int,ll> >ed[maxn];
	ll f[maxn][2];
	bool spc[maxn];
	void init(int nn){
		n=nn;
		for(int i=1;i<=n;i++)ed[i].clear();
	}
	void dfs(int u,int fa){
		f[u][0]=f[u][1]=0;
		if(spc[u])f[u][0]=inf;
		else f[u][1]=inf;
		for(auto [v,w]:ed[u]){
			if(v==fa)continue;
			dfs(v,u);
			ll tmp[2];
			for(int o=0;o<2;o++)tmp[o]=f[u][o],f[u][o]=inf;
			for(int o1=0;o1<2;o1++){
				for(int o2=0;o2<2;o2++){
					f[u][o1|o2]=min(f[u][o1|o2],f[v][o2]+tmp[o1]);
					f[u][o1]=min(f[u][o1],f[v][o2]+tmp[o1]+w);
				}
			}
		}
	}
}
bool spc[maxn];
int id[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n;
	for(int i=1;i<n;i++){
		int u,v,w;cin>>u>>v>>w;
		ed[u].emplace_back(mkp(v,w));
		ed[v].emplace_back(mkp(u,w));
	}
	dfs(1,0);
	cin>>m;
	for(int i=1;i<=m;i++){
		int k;cin>>k;
		vector<int>pnt;
		for(int j=1;j<=k;j++){
			int x;cin>>x;
			spc[x]=1;
			pnt.emplace_back(x);
		}
		pnt.emplace_back(1);
		sort(pnt.begin(),pnt.end(),[&](int x,int y){return dfn[x]<dfn[y];});
		pnt.erase(unique(pnt.begin(),pnt.end()),pnt.end());
		int sz=pnt.size();
		for(int i=0;i<sz-1;i++)pnt.emplace_back(get_lca(pnt[i],pnt[i+1]));
		sort(pnt.begin(),pnt.end(),[&](int x,int y){return dfn[x]<dfn[y];});
		pnt.erase(unique(pnt.begin(),pnt.end()),pnt.end());
		Graph::init(pnt.size());
		for(int i=0;i<pnt.size();i++)id[pnt[i]]=i+1;
		for(int i=0;i<pnt.size()-1;i++){
			int l=get_lca(pnt[i],pnt[i+1]);
			int w=get_weight(pnt[i+1],l);
			Graph::ed[id[l]].emplace_back(mkp(id[pnt[i+1]],w));
			Graph::ed[id[pnt[i+1]]].emplace_back(mkp(id[l],w));
		}
		for(auto x:pnt)Graph::spc[id[x]]=spc[x];
		Graph::dfs(1,0);
		cout<<Graph::f[1][0]<<'\n';
		for(auto x:pnt)id[x]=spc[x]=0;
	}
	return 0;
}
```

### 树哈希

哈希函数可能为了适配双哈希要换个实现。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=50+7;
const ll inf=1e15;
const int B1=10003,B2=2009;
const int XX=103;
const ull mask = mt19937_64(time(0))();
ull gg(ull x) {
    return (x ^= mask, x ^= x << 13, x ^= x >> 7, x ^= x << 17) ^ mask;
}
struct Tree{
	pair<ull,ull>f[maxn];
	vector<int>ed[maxn];
	int n;
	int siz[maxn],maxi[maxn];
	int root;
	int root2;
	pair<ull,ull>hsh;
	void dfs1(int u,int fa){
		maxi[u]=0;
		siz[u]=1;
		for(auto v:ed[u]){
			if(v==fa)continue;
			dfs1(v,u);
			siz[u]+=siz[v];
			maxi[u]=max(maxi[u],siz[v]);
		}
		maxi[u]=max(maxi[u],n-siz[u]);
		if(!root||maxi[u]<maxi[root])root=u;
		else if(maxi[u]==maxi[root])root2=u;
	}
	void dfs2(int u,int fa){
		f[u]=mkp(0,0);
		for(auto v:ed[u]){
			if(v==fa)continue;
			dfs2(v,u);
			f[u].first+=gg(f[v].first);
			f[u].second+=gg(f[v].second);
		}
		f[u].first+=B1;
		f[u].second+=B2;
	}
	void solve(){
		root=0;root2=-1;
		dfs1(1,0);
		dfs2(root,0);
		hsh=f[root];
		if(root2!=-1&&maxi[root]==maxi[root2]){
			dfs2(root2,0);
			hsh=min(hsh,f[root2]);
		}
	}
}tr[maxn];
bool same(Tree &a,Tree &b){
	if(a.n!=b.n)return 0;
	if(a.hsh==b.hsh)return 1;
	return 0;
}
```

## 三、DS

### 莫队

普通莫队

注意对询问的排序。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.5e5+7;
const int inf=1e9;
int SIZ;
int n,m,k;
int a[maxn];
pair<int,int>qry[maxn];
ll ans;
int tong[maxn];
void add(int x){
	ans-=1ll*tong[x]*tong[x];
	tong[x]++;
	ans+=1ll*tong[x]*tong[x];
}
void del(int x){
	ans-=1ll*tong[x]*tong[x];
	tong[x]--;
	ans+=1ll*tong[x]*tong[x];
}
int nowl=1,nowr=0;
void move(int l,int r){
	while(nowr<r)add(a[++nowr]);
	while(nowl>l)add(a[--nowl]);
	while(nowr>r)del(a[nowr--]);
	while(nowl<l)del(a[nowl++]);
}
ll res[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m>>k;
	for(int i=1;i<=n;i++)cin>>a[i];
	for(int i=1;i<=m;i++){
		int l,r;cin>>l>>r;
		qry[i]=mkp(l,r);
	}
	vector<int>qry_id;for(int i=1;i<=m;i++)qry_id.emplace_back(i);
	SIZ=sqrt(n);
	sort(qry_id.begin(),qry_id.end(),[&](int x,int y){
		if(qry[x].first/SIZ!=qry[y].first/SIZ)return qry[x].first<qry[y].first;
		if((qry[x].first/SIZ)&1)return qry[x].second<qry[y].second;
		return qry[x].second>qry[y].second;
	});
	for(auto id:qry_id){
		move(qry[id].first,qry[id].second);
		res[id]=ans;
	}
	for(int i=1;i<=m;i++)cout<<res[i]<<'\n';
	return 0;
}
/*
8
1 6 2 2 3 3 1 6
5
1 4
2 5
2 8
5 6
1 7

*/
```

回滚莫队

采用了一些分块的实现。

记！得！清！操！作！

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.5e5+7;
const int inf=1e9;
int SIZ,belong[maxn],bl[1003],br[1003];
int n,m;
int a[maxn];
int lsh[maxn],tot;
int maxi[maxn],mini[maxn];
vector<pair<pair<int,int>,int> >qry[1003];
vector<pair<int,int> >chgmax,chgmin;
int max_dis;
void upd_max(int x,int y){
	if(y>maxi[x]){
		chgmax.emplace_back(mkp(x,maxi[x]));
		maxi[x]=y;
		max_dis=max(max_dis,maxi[x]-mini[x]);
	}
}
void upd_min(int x,int y){
	if(y<mini[x]){
		chgmin.emplace_back(mkp(x,mini[x]));
		mini[x]=y;
		max_dis=max(max_dis,maxi[x]-mini[x]);
	}
}
void undo(int mxsz,int mnsz,int mxdis){
	while(chgmax.size()>mxsz){
		auto [p,v]=chgmax.back();chgmax.pop_back();
		maxi[p]=v;
	}
	while(chgmin.size()>mnsz){
		auto [p,v]=chgmin.back();chgmin.pop_back();
		mini[p]=v;
	}
	max_dis=mxdis;
}
int ans[maxn];
vector<pair<int,int> >qry_on_pos[maxn];
void solve(int blk){
	chgmax.clear();chgmin.clear();
	vector<pair<pair<int,int>,int> >inside_qry,outside_qry;
	for(auto [seq,id]:qry[blk]){
		if(seq.second>br[blk])outside_qry.emplace_back(mkp(seq,id));
		else inside_qry.emplace_back(mkp(seq,id));
	}
	for(int i=1;i<=tot;i++)maxi[i]=-inf,mini[i]=inf;
	max_dis=0;
	for(auto [seq,id]:inside_qry){
		for(int i=seq.first;i<=seq.second;i++){
			upd_max(a[i],i);
			upd_min(a[i],i);
		}
		ans[id]=max_dis;
		undo(0,0,0);
	}
	for(int i=1;i<=n;i++)qry_on_pos[i].clear();
	for(auto [seq,id]:outside_qry){
		qry_on_pos[seq.second].emplace_back(mkp(seq.first,id));
	}
	for(int i=br[blk]+1;i<=n;i++){
		upd_max(a[i],i);
		upd_min(a[i],i);
		for(auto [l,id]:qry_on_pos[i]){
			int mx=chgmax.size(),mn=chgmin.size(),preans=max_dis;
			for(int j=l;j<=br[blk];j++)upd_max(a[j],j),upd_min(a[j],j);
			ans[id]=max_dis;
			undo(mx,mn,preans);
		}
	}

}
signed main(){
	ios::sync_with_stdio(0);
	cin>>n;SIZ=sqrt(n);
	for(int i=1;i<=n;i++)cin>>a[i],lsh[++tot]=a[i];
	sort(lsh+1,lsh+1+tot);tot=unique(lsh+1,lsh+1+tot)-lsh-1;
	for(int i=1;i<=n;i++)a[i]=lower_bound(lsh+1,lsh+1+tot,a[i])-lsh;
	for(int i=1;i<=n;i++)belong[i]=belong[max(i-SIZ,0)]+1;
	for(int i=1;i<=n/SIZ+2;i++)bl[i]=inf;
	for(int i=1;i<=n;i++){
		bl[belong[i]]=min(bl[belong[i]],i);
		br[belong[i]]=max(br[belong[i]],i);
	}
	cin>>m;
	for(int i=1;i<=m;i++){
		int l,r;cin>>l>>r;
		qry[belong[l]].emplace_back(mkp(mkp(l,r),i));
	}
	for(int blk=1;br[blk];blk++)solve(blk);
	for(int i=1;i<=m;i++)cout<<ans[i]<<'\n';
	return 0;
}
/*
8
1 6 2 2 3 3 1 6
5
1 4
2 5
2 8
5 6
1 7

*/
```

### 主席树

由于没有 `build`，因此 `query` 时有可能遇到空节点，需知悉。

这里简单实现了区间第 k 大

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.5e5+7;
const int inf=1e9;
namespace HJT{
	struct node{
		int ls,rs;
		int sum;
	}tree[10000007];
	#define ls(o) (tree[o].ls)
	#define rs(o) (tree[o].rs)
	int tot;
	int new_node(){
		++tot;
		ls(tot)=rs(tot)=tree[tot].sum=0;
		return tot;
	}
	void update(int &o,int pre,int l,int r,int p,int k){
		o=new_node();tree[o]=tree[pre];
		if(l==r){
			tree[o].sum+=k;
			return;
		}
		int mid=l+r>>1;
		if(p<=mid)update(ls(o),ls(pre),l,mid,p,k);
		else update(rs(o),rs(pre),mid+1,r,p,k);
		tree[o].sum=tree[ls(o)].sum+tree[rs(o)].sum;
	}
	int query(int o1,int o2,int l,int r,int k){
		if(l==r)return l;
		int mid=l+r>>1;
		if(tree[ls(o2)].sum-tree[ls(o1)].sum<k)return query(rs(o1),rs(o2),mid+1,r,k-tree[ls(o2)].sum+tree[ls(o1)].sum);
		return query(ls(o1),ls(o2),l,mid,k);
	}
}
int n,m;
int a[maxn];
int root[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m;
	for(int i=1;i<=n;i++)cin>>a[i];
	for(int i=1;i<=n;i++)HJT::update(root[i],root[i-1],0,1e9,a[i],1);
	for(int i=1;i<=m;i++){
		int l,r,k;cin>>l>>r>>k;
		cout<<HJT::query(root[l-1],root[r],0,1e9,k)<<'\n';
	}
	return 0;
}
/*
5 5
25957 6405 15770 26287 26465 
2 2 1
3 4 1
4 5 1
1 2 2
4 4 1


*/
```

### 吉司机线段树

采用最假女选手处的板子

注意 `max` 和 `min` 同时压时要考虑数字种类数为 1 与 2 时情况。

以及 `push_down` 要注意不要用自己的 `maxi` 和 `mini` 算哪个孩子该传标记，毕竟自己已经改过了。

以及 `add_tag` 注意顺序！！！！！！

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const ll inf=1e15;
int n,m;
int a[maxn];
namespace SegT{
	struct node{
		int l,r;
		ll maxi,mini;
		ll sema,semi;
		ll sum;
		ll lami,lama,laal;
		int cntma,cntmi;
	}tree[maxn<<2];
	#define ls(o) (o<<1)
	#define rs(o) (o<<1|1)
	void push_up(int o){
		tree[o].sum=tree[ls(o)].sum+tree[rs(o)].sum;
		if(tree[ls(o)].maxi>tree[rs(o)].maxi){
			tree[o].maxi=tree[ls(o)].maxi;
			tree[o].sema=max(tree[ls(o)].sema,tree[rs(o)].maxi);
			tree[o].cntma=tree[ls(o)].cntma;
		}
		else if(tree[ls(o)].maxi<tree[rs(o)].maxi){
			tree[o].maxi=tree[rs(o)].maxi;
			tree[o].sema=max(tree[ls(o)].maxi,tree[rs(o)].sema);
			tree[o].cntma=tree[rs(o)].cntma;
		}
		else{
			tree[o].maxi=tree[ls(o)].maxi;
			tree[o].sema=max(tree[ls(o)].sema,tree[rs(o)].sema);
			tree[o].cntma=tree[ls(o)].cntma+tree[rs(o)].cntma;
		}


		if(tree[ls(o)].mini<tree[rs(o)].mini){
			tree[o].mini=tree[ls(o)].mini;
			tree[o].semi=min(tree[ls(o)].semi,tree[rs(o)].mini);
			tree[o].cntmi=tree[ls(o)].cntmi;
		}
		else if(tree[ls(o)].mini>tree[rs(o)].mini){
			tree[o].mini=tree[rs(o)].mini;
			tree[o].semi=min(tree[ls(o)].mini,tree[rs(o)].semi);
			tree[o].cntmi=tree[rs(o)].cntmi;
		}
		else{
			tree[o].mini=tree[ls(o)].mini;
			tree[o].semi=min(tree[ls(o)].semi,tree[rs(o)].semi);
			tree[o].cntmi=tree[ls(o)].cntmi+tree[rs(o)].cntmi;
		}
	}
	void add_tag(int o,ll lami,ll lama,ll laal){
		tree[o].lami+=lami;
		tree[o].lama+=lama;
		tree[o].laal+=laal;

		tree[o].maxi+=laal;
		tree[o].mini+=laal;
		tree[o].sema+=laal;
		tree[o].semi+=laal;
		tree[o].sum+=laal*(tree[o].r-tree[o].l+1);
		if(tree[o].maxi==tree[o].mini){
			tree[o].maxi+=lami+lama;
			tree[o].mini+=lami+lama;
			tree[o].sum+=(tree[o].r-tree[o].l+1)*(lami+lama);
			tree[o].sema=-inf;
			tree[o].semi=inf;
			return;
		}
		if(tree[o].maxi==tree[o].semi)tree[o].semi+=lama;
		if(tree[o].mini==tree[o].sema)tree[o].sema+=lami;
		tree[o].maxi+=lama;
		tree[o].mini+=lami;
		tree[o].sum+=tree[o].cntma*lama;
		tree[o].sum+=tree[o].cntmi*lami;
	}
	void push_down(int o){
		ll mini=min(tree[ls(o)].mini,tree[rs(o)].mini),maxi=max(tree[ls(o)].maxi,tree[rs(o)].maxi);
		add_tag(ls(o),tree[o].lami*(mini==tree[ls(o)].mini),tree[o].lama*(maxi==tree[ls(o)].maxi),tree[o].laal);
		add_tag(rs(o),tree[o].lami*(mini==tree[rs(o)].mini),tree[o].lama*(maxi==tree[rs(o)].maxi),tree[o].laal);
		tree[o].lami=tree[o].lama=tree[o].laal=0;
	}
	void build(int o,int l,int r){
		tree[o].l=l,tree[o].r=r;
		tree[o].sum=tree[o].lami=tree[o].lama=tree[o].laal=0;
		tree[o].cntma=tree[o].cntmi=0;
		if(l==r){
			tree[o].maxi=tree[o].mini=a[l];tree[o].sum=a[l];
			tree[o].sema=-inf;tree[o].semi=inf;
			tree[o].cntma=tree[o].cntmi=1;
			return;
		}
		int mid=l+r>>1;
		build(ls(o),l,mid);build(rs(o),mid+1,r);
		push_up(o);
	}
	void update1(int o,int l,int r,int k){
		if(l<=tree[o].l&&tree[o].r<=r){
			add_tag(o,0,0,k);
			return;
		}
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		if(l<=mid)update1(ls(o),l,r,k);
		if(r>mid)update1(rs(o),l,r,k);
		push_up(o);
	}
	void update2(int o,int l,int r,int k){
		// cout<<o<<' '<<l<<' '<<r<<' '<<k<<endl;
		if(tree[o].mini>=k)return;
		if(l<=tree[o].l&&tree[o].r<=r){
			if(tree[o].semi>k){
				add_tag(o,k-tree[o].mini,0,0);
				return;
			}
		}
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		if(l<=mid)update2(ls(o),l,r,k);
		if(r>mid)update2(rs(o),l,r,k);
		push_up(o);
	}
	void update3(int o,int l,int r,int k){
		if(tree[o].maxi<=k)return;
		if(l<=tree[o].l&&tree[o].r<=r){
			if(tree[o].sema<k){
				add_tag(o,0,k-tree[o].maxi,0);
				return;
			}
		}
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		if(l<=mid)update3(ls(o),l,r,k);
		if(r>mid)update3(rs(o),l,r,k);
		push_up(o);
	}
	ll query1(int o,int l,int r){
		if(l<=tree[o].l&&tree[o].r<=r)return tree[o].sum;
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		ll ans=0;
		if(l<=mid)ans+=query1(ls(o),l,r);
		if(r>mid)ans+=query1(rs(o),l,r);
		return ans;
	}
	ll query2(int o,int l,int r){
		if(l<=tree[o].l&&tree[o].r<=r)return tree[o].maxi;
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		ll ans=-inf;
		if(l<=mid)ans=max(ans,query2(ls(o),l,r));
		if(r>mid)ans=max(ans,query2(rs(o),l,r));
		return ans;
	}
	ll query3(int o,int l,int r){
		if(l<=tree[o].l&&tree[o].r<=r)return tree[o].mini;
		push_down(o);
		int mid=tree[o].l+tree[o].r>>1;
		ll ans=inf;
		if(l<=mid)ans=min(ans,query3(ls(o),l,r));
		if(r>mid)ans=min(ans,query3(rs(o),l,r));
		return ans;
	}
}
signed main(){
	ios::sync_with_stdio(0);
	cin>>n;
	for(int i=1;i<=n;i++)cin>>a[i];
	SegT::build(1,1,n);
	cin>>m;
	for(int i=1;i<=m;i++){
		int op;cin>>op;
		int l,r,k;cin>>l>>r;
		if(op<=3){
			cin>>k;
		}
		if(op==1)SegT::update1(1,l,r,k);
		if(op==2)SegT::update2(1,l,r,k);
		if(op==3)SegT::update3(1,l,r,k);
		if(op==4)cout<<SegT::query1(1,l,r)<<endl;
		if(op==5)cout<<SegT::query2(1,l,r)<<endl;
		if(op==6)cout<<SegT::query3(1,l,r)<<endl;
	}
	return 0;
}
```

### 笛卡尔树

还是要知道 $O(n)$ 怎么写的。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const int inf=1e9;
int n;
int p[maxn];
int pre[maxn],suf[maxn];
int ls[maxn],rs[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n;
	for(int i=1;i<=n;i++)cin>>p[i];
	p[0]=p[n+1]=-inf;
	vector<int>st;
	
	st.emplace_back(0);
	for(int i=1;i<=n;i++){
		while(p[i]<p[st.back()])st.pop_back();
		pre[i]=st.back();
		st.emplace_back(i);
	}
	st.clear();

	st.emplace_back(n+1);
	for(int i=n;i;i--){
		while(p[i]<p[st.back()])st.pop_back();
		suf[i]=st.back();
		st.emplace_back(i);
	}

	for(int i=1;i<=n;i++)ls[i]=inf,rs[i]=-inf;
	for(int i=1;i<=n;i++){
		if(pre[i]!=0)rs[pre[i]]=max(rs[pre[i]],i);
		if(suf[i]!=n+1)ls[suf[i]]=min(ls[suf[i]],i);
	}
	for(int i=1;i<=n;i++){
		if(ls[i]==inf)ls[i]=0;
		if(rs[i]==-inf)rs[i]=0;
	}
	return 0;
}
```

### 线段树合并

**记得 `return`，记得最后赋值到根上**

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const int inf=1e9;
int n,m;
namespace SegT{
	struct node{
		int ls,rs;
		pair<int,int>maxi;
	}tree[10000007];
	int tot;
	#define ls(o) (tree[o].ls)
	#define rs(o) (tree[o].rs)
	int new_node(){
		++tot;
		tree[tot].ls=tree[tot].rs=0;
		tree[tot].maxi=mkp(0,0);
		return tot;
	}
	void push_up(int o){
		tree[o].maxi=max(tree[ls(o)].maxi,tree[rs(o)].maxi);
	}
	void update(int &o,int l,int r,int p,int k){
		if(!o)o=new_node();
		if(l==r){
			tree[o].maxi.first+=k;
			tree[o].maxi.second=-p;
			return ;
		}
		int mid=l+r>>1;
		if(p<=mid)update(ls(o),l,mid,p,k);
		else update(rs(o),mid+1,r,p,k);
		push_up(o);
	}
	int merge(int a,int b,int l,int r){
		if(!a||!b)return a+b;
		if(l==r){
			tree[a].maxi.first+=tree[b].maxi.first;
			return a;
		}
		int mid=l+r>>1;
		ls(a)=merge(ls(a),ls(b),l,mid);
		rs(a)=merge(rs(a),rs(b),mid+1,r);
		push_up(a);
		return a;
	}
}
int dep[maxn],f[maxn][26];
vector<int>ed[maxn];
void dfs(int u,int fa){
	dep[u]=dep[fa]+1;
	f[u][0]=fa;
	for(int i=1;i<=20;i++)f[u][i]=f[f[u][i-1]][i-1];
	for(auto v:ed[u]){
		if(v==fa)continue;
		dfs(v,u);
	}
}
int get_lca(int a,int b){
	if(dep[a]<dep[b])swap(a,b);
	for(int i=20;i>=0;i--)if(dep[f[a][i]]>=dep[b])a=f[a][i];
	if(a==b)return a;
	for(int i=20;i>=0;i--)if(f[a][i]!=f[b][i])a=f[a][i],b=f[b][i];
	return f[a][0];
}
int root[maxn];
int ans[maxn];
void dfs2(int u,int fa){
	for(auto v:ed[u]){
		if(v==fa)continue;
		dfs2(v,u);
		root[u]=SegT::merge(root[u],root[v],1,1e5);
	}
	pair<int,int>maxi=SegT::tree[root[u]].maxi;
	if(maxi.first==0)ans[u]=0;
	else ans[u]=-maxi.second;
}
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>m;
	for(int i=1;i<n;i++){
		int u,v;cin>>u>>v;
		ed[u].emplace_back(v);ed[v].emplace_back(u);
	}
	dfs(1,0);
	for(int i=1;i<=m;i++){
		int x,y,z;cin>>x>>y>>z;
		int l=get_lca(x,y);
		SegT::update(root[x],1,1e5,z,1);
		SegT::update(root[y],1,1e5,z,1);
		SegT::update(root[l],1,1e5,z,-1);
		SegT::update(root[f[l][0]],1,1e5,z,-1);
	}
	dfs2(1,0);
	for(int i=1;i<=n;i++)cout<<ans[i]<<'\n';
	return 0;
}
```

### CDQ

注意清空。

注意归并边界条件，以及中间是或。

注意对相同值的处理。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=5e5+7;
const int inf=1e9;
int n,K;
namespace BIT{
	int tree[maxn];
	int lowbit(int x){
		return x&(-x);
	}
	void add(int p,int k){
		while(p<=K){
			tree[p]+=k;
			p+=lowbit(p);
		}
	}
	int query(int p){
		int ans=0;
		while(p)ans+=tree[p],p-=lowbit(p);
		return ans;
	}
}
int a[maxn],b[maxn],c[maxn];
int val[maxn];
int tmp[maxn];
int f[maxn];
void solve(int l,int r){
	if(l==r)return;
	int mid=l+r>>1;
	solve(l,mid);solve(mid+1,r);
	int p1=l,p2=mid+1;
	int tot=0;
	while(p1<=mid||p2<=r){
		bool chs=-1;
		if(p1>mid)chs=1;
		else if(p2>r)chs=0;
		else if(b[val[p1]]<=b[val[p2]])chs=0;
		else chs=1;
		if(chs==0){
			BIT::add(c[val[p1]],1);
			tmp[++tot]=val[p1++];
		}
		else{
			f[val[p2]]+=BIT::query(c[val[p2]]);
			tmp[++tot]=val[p2++];
		}
	}
	for(int i=l;i<=mid;i++)BIT::add(c[val[i]],-1);
	for(int i=l;i<=r;i++)val[i]=tmp[i-l+1];
}
int ans[maxn];
map<tuple<int,int,int>,int>cnt;
signed main(){
	ios::sync_with_stdio(0);
	cin>>n>>K;
	for(int i=1;i<=n;i++)cin>>a[i]>>b[i]>>c[i];
	for(int i=1;i<=n;i++)val[i]=i;
	sort(val+1,val+1+n,[&](int x,int y){
		if(a[x]!=a[y])return a[x]<a[y];
		if(b[x]!=b[y])return b[x]<b[y];
		return c[x]<c[y];
	});
	solve(1,n);
	for(int i=1;i<=n;i++)cnt[mkt(a[i],b[i],c[i])]=max(cnt[mkt(a[i],b[i],c[i])],f[i]);
	for(int i=1;i<=n;i++)ans[cnt[mkt(a[i],b[i],c[i])]]++;
	for(int i=0;i<n;i++)cout<<ans[i]<<'\n';
	return 0;
}
```

### 点分治

放的板子，但是是能拓展的一版（正着统计一遍，反着统计一遍）

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=4e4+7;
const ll inf=1e15;
int n,m;
vector<pair<int,int> >ed[maxn];
int root;
int maxi[maxn],siz[maxn];
bool vis[maxn];
void get_root(int u,int fa,int total){
    siz[u]=1;maxi[u]=0;
    for(auto [v,w]:ed[u]){
        if(vis[v]||v==fa)continue;
        get_root(v,u,total);
        siz[u]+=siz[v];
        maxi[u]=max(maxi[u],siz[v]);
    }
    maxi[u]=max(maxi[u],total-siz[u]);
    if(!root||maxi[u]<maxi[root])root=u;
}
vector<int>pnt;
void dfs(int u,int fa,int fr,int dp){
    pnt.emplace_back(dp);
    siz[u]=1;
    for(auto [v,w]:ed[u]){
        if(v==fa||vis[v])continue;
        dfs(v,u,fr,dp+w);
        siz[u]+=siz[v];
    }
}
int qry[maxn];
int cnt[10000007];
int ans[maxn];
void solve(int u){
    vis[u]=1;
    cnt[0]=1;
    for(auto [v,w]:ed[u]){
        if(vis[v])continue;
        pnt.clear();
        dfs(v,u,v,w);
        for(auto d:pnt){
            for(int i=1;i<=m;i++){
                if(qry[i]>=d&&cnt[qry[i]-d])ans[i]=1;
            }
        }
        for(auto d:pnt)if(d<=1e7)cnt[d]++;
    }
    for(auto [v,w]:ed[u]){
        if(vis[v])continue;
        pnt.clear();
        dfs(v,u,v,w);
        for(auto d:pnt)if(d<=1e7)cnt[d]--;
        for(auto d:pnt){
            for(int i=1;i<=m;i++){
                if(qry[i]>=d&&cnt[qry[i]-d])ans[i]=1;
            }
        }
    }
    cnt[0]=0;
    for(auto [v,w]:ed[u]){
        if(vis[v])continue;
        root=0;get_root(v,u,siz[v]);
        solve(root);
    }
}
signed main(){
	ios::sync_with_stdio(0);
    cin>>n>>m;
    for(int i=2;i<=n;i++){
        int u,v,w;cin>>u>>v>>w;
        ed[u].emplace_back(mkp(v,w));ed[v].emplace_back(mkp(u,w));
    }
    for(int i=1;i<=m;i++)cin>>qry[i];
    root=0;
    get_root(1,0,n);
    solve(root);
    for(int i=1;i<=m;i++){
        cout<<(ans[i]?"AYE\n":"NAY\n");
    }
	return 0;
}
```

### ddp

尽量使用列向量。

记得维护每个轻链对父亲的贡献。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e5+7;
const ll inf=1e14;
const ld eps=1e-9;
int n,m;
struct Matrix{
    ll mat[2][2];
    friend Matrix operator * (Matrix a,Matrix b){
        Matrix c;
        for(int i=0;i<2;i++){
            for(int j=0;j<2;j++){
                c.mat[i][j]=0;
                for(int k=0;k<2;k++)c.mat[i][j]=max(c.mat[i][j],a.mat[i][k]+b.mat[k][j]);
            }
        }
        return c;
    }
}ept,ini_vec;
Matrix g2M(pair<ll,ll>g){
    Matrix val;
    val.mat[0][0]=-inf;
    val.mat[0][1]=g.second;
    val.mat[1][0]=g.first;
    val.mat[1][1]=g.second;
    return val;
}
void init(){
    for(int i=0;i<2;i++){
        for(int j=0;j<2;j++){
            ept.mat[i][j]=(i==j?0:-inf);
            ini_vec.mat[i][j]=(j==0?0:-inf);
        }
    }
}
namespace SegT{
    struct node{
        int l,r;
        Matrix val;
    }tree[maxn<<2];
    #define ls(o) (o<<1)
    #define rs(o) (o<<1|1)
    void push_up(int o){
        tree[o].val=tree[ls(o)].val*tree[rs(o)].val;
    }
    void build(int o,int l,int r){
        tree[o].l=l,tree[o].r=r;
        if(l==r){
            tree[o].val.mat[0][0]=-inf;
            tree[o].val.mat[0][1]=tree[o].val.mat[1][0]=tree[o].val.mat[1][1]=0;
            return;
        }
        int mid=l+r>>1;
        build(ls(o),l,mid);build(rs(o),mid+1,r);
        push_up(o);
    }
    void update(int o,int p,Matrix k){
        if(tree[o].l==tree[o].r){
            tree[o].val=k;
            return;
        }
        int mid=tree[o].l+tree[o].r>>1;
        if(p<=mid)update(ls(o),p,k);
        else update(rs(o),p,k);
        push_up(o);
    }
    Matrix query(int o,int l,int r){
        if(l<=tree[o].l&&tree[o].r<=r)return tree[o].val;
        int mid=tree[o].l+tree[o].r>>1;
        Matrix ans=ept;
        if(l<=mid)ans=ans*query(ls(o),l,r);
        if(r>mid)ans=ans*query(rs(o),l,r);
        return ans;
    }
}
vector<int>ed[maxn];
int f[maxn],dep[maxn],son[maxn],siz[maxn];
void dfs1(int u,int fa){
    f[u]=fa;
    dep[u]=dep[fa]+1;
    siz[u]=1;
    for(auto v:ed[u]){
        if(v==fa)continue;
        dfs1(v,u);
        siz[u]+=siz[v];
        if(siz[v]>siz[son[u]])son[u]=v;
    }
}
int tot,dfn[maxn],top[maxn],btm[maxn];
void dfs2(int u,int tp){
    dfn[u]=++tot;
    top[u]=tp;
    if(son[u])dfs2(son[u],tp);
    else btm[top[u]]=u;
    for(auto v:ed[u]){
        if(v!=f[u]&&v!=son[u])dfs2(v,v);
    }
}
ll ctbt[maxn][2];
ll g[maxn][2];
int a[maxn];
int b[maxn];
ll update(int p,int k){
    g[p][0]-=a[p];
    a[p]=k;
    g[p][0]+=a[p];
    SegT::update(1,dfn[p],g2M(mkp(g[p][0],g[p][1])));
    int now=btm[top[p]];
    while(now){
        Matrix val=ini_vec;
        val=SegT::query(1,dfn[top[now]],dfn[now])*val;
        if(f[top[now]]==0)return val.mat[1][0];
        g[f[top[now]]][0]-=ctbt[top[now]][0];
        g[f[top[now]]][1]-=ctbt[top[now]][1];
        ctbt[top[now]][0]=val.mat[0][0];
        ctbt[top[now]][1]=val.mat[1][0];
        g[f[top[now]]][0]+=ctbt[top[now]][0];
        g[f[top[now]]][1]+=ctbt[top[now]][1];
        SegT::update(1,dfn[f[top[now]]],g2M(mkp(g[f[top[now]]][0],g[f[top[now]]][1])));
        now=btm[top[f[top[now]]]];
    }
    assert(0);
}
signed main(){
	ios::sync_with_stdio(0);
    init();
    cin>>n>>m;
    for(int i=1;i<=n;i++)cin>>b[i];
    for(int i=2;i<=n;i++){
        int u,v;cin>>u>>v;
        ed[u].emplace_back(v);
        ed[v].emplace_back(u);
    }
    dfs1(1,0);
    dfs2(1,1);
    SegT::build(1,1,n);
    ll ans=0;
    for(int i=1;i<=n;i++)ans=update(i,b[i]);
    // cout<<ans<<endl;
    for(int i=1;i<=m;i++){
        int x,y;cin>>x>>y;
        ans=update(x,y);
        cout<<ans<<endl;
    }
	return 0;
}
```

## 四、字符串

### KMP

注意串间匹配时可能会越界。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
int n,m;
char a[maxn],b[maxn];
int kmp[maxn];
signed main(){
	ios::sync_with_stdio(0);
	string tmp;
	cin>>tmp;n=tmp.size();for(int i=1;i<=n;i++)a[i]=tmp[i-1];
	cin>>tmp;m=tmp.size();for(int i=1;i<=m;i++)b[i]=tmp[i-1];
	kmp[1]=0;
	for(int i=2;i<=m;i++){
		kmp[i]=kmp[i-1];
		while(kmp[i]&&b[kmp[i]+1]!=b[i])kmp[i]=kmp[kmp[i]];
		if(b[kmp[i]+1]==b[i])kmp[i]++;
	}
	int now=0;
	for(int i=1;i<=n;i++){
		while(now&&(now+1>m||b[now+1]!=a[i]))now=kmp[now];
		if(b[now+1]==a[i])now++;
		if(now==m){
			cout<<i-m+1<<endl;
		}
	}
	for(int i=1;i<=m;i++)cout<<kmp[i]<<' ';cout<<endl;
	return 0;
}
```

### Manacher

注意补全之后其实并不需要对中心不同的情况进行分讨，这或许也是补全的好处（

然后需要二倍空间。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2.2e7+7;
int r[maxn];
int n;
char s[maxn];
signed main(){
	ios::sync_with_stdio(0);
	string tmp;cin>>tmp;n=tmp.size();for(int i=1;i<=n;i++)s[i*2]=tmp[i-1];
	n=2*n+1;
	for(int i=1;i<=n;i++)if(i&1)s[i]='*';
	s[1]='*';s[n]='*';
	r[1]=0;
	pair<int,int>maxi=mkp(1,1);
	for(int i=2;i<=n;i++){
		if(i>maxi.first)r[i]=0;
		else r[i]=min(r[2*maxi.second-i],maxi.first-i);
		while(i-r[i]-1>=1&&i+r[i]+1<=n&&s[i-r[i]-1]==s[i+r[i]+1])r[i]++;
		maxi=max(maxi,mkp(i+r[i],i));
	}
	int ans=0;
	for(int i=2;i<n;i++){
		ans=max(ans,r[i]);
	}
	cout<<ans<<endl;
	return 0;
}
```

### Z 函数

注意两个数组别打反。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2e7+7;
const ll inf=1e15;
int z[maxn];
int p[maxn];
int n,m;
char a[maxn],b[maxn];
signed main(){
	ios::sync_with_stdio(0);
	string tmp;
	cin>>tmp;n=tmp.size();for(int i=1;i<=n;i++)a[i]=tmp[i-1];
	cin>>tmp;m=tmp.size();for(int i=1;i<=m;i++)b[i]=tmp[i-1];
	z[1]=m;
	pair<int,int>maxi=mkp(0,1);
	for(int i=2;i<=m;i++){
		if(maxi.first>=i){
			z[i]=min(z[i-maxi.second+1],maxi.first-i+1);
		}
		while(i+z[i]<=m&&b[i+z[i]]==b[z[i]+1])z[i]++;
		maxi=max(maxi,mkp(i+z[i]-1,i));
	}
	maxi=mkp(0,1);
	for(int i=1;i<=n;i++){
		if(maxi.first>=i){
			p[i]=min(z[i-maxi.second+1],maxi.first-i+1);
		}
		while(i+p[i]<=n&&p[i]+1<=m&&b[p[i]+1]==a[i+p[i]])p[i]++;
		maxi=max(maxi,mkp(i+p[i]-1,i));
	}
	ll val1=0;for(int i=1;i<=m;i++)val1^=1ll*i*(z[i]+1);
	ll val2=0;for(int i=1;i<=n;i++)val2^=1ll*i*(p[i]+1);
	cout<<val1<<endl;
	cout<<val2<<endl;
	return 0;
}
```

### AC 自动机

注意对根的特殊处理。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2e6+7;
const ll inf=1e15;
namespace ACAM{
	struct node{
		int ch[26];
		int fail;
		int sum;
	}tree[maxn];
	int root=1,tot=1;
	void init(){
		for(int i=1;i<=tot;i++){
			tree[i].fail=0,tree[i].sum=0;
			for(int j=0;j<26;j++)tree[i].ch[j]=0;
		}
		root=1;tot=1;
	}
	int add(string s){
		int now=root;
		for(int i=0;i<s.length();i++){
			if(!tree[now].ch[s[i]-'a'])tree[now].ch[s[i]-'a']=++tot;
			now=tree[now].ch[s[i]-'a'];
		}
		return now;
	}
	void build(){
		queue<int>q;
		tree[1].fail=1;
		for(int j=0;j<26;j++){
			if(!tree[1].ch[j])tree[1].ch[j]=1;
			else {
				tree[tree[1].ch[j]].fail=1;
				q.push(tree[1].ch[j]);
			}
		}
		while(!q.empty()){
			int u=q.front();q.pop();
			// cout<<u<<endl;
			for(int j=0;j<26;j++){
				if(tree[u].ch[j]){
					tree[tree[u].ch[j]].fail=tree[tree[u].fail].ch[j];
					q.push(tree[u].ch[j]);
				}
				else tree[u].ch[j]=tree[tree[u].fail].ch[j];
			}
		}
	}
	int d[maxn];
	void solve(string s){
		int now=root;
		for(int i=0;i<s.length();i++){
			now=tree[now].ch[s[i]-'a'];
			tree[now].sum++;
		}
		for(int i=1;i<=tot;i++){
			d[i]=0;
		}
		for(int i=2;i<=tot;i++){
			d[tree[i].fail]++;
		}
		queue<int>q;
		for(int i=1;i<=tot;i++)if(!d[i])q.push(i);
		while(!q.empty()){
			int u=q.front();q.pop();
			if(u==1)continue;
			tree[tree[u].fail].sum+=tree[u].sum;
			d[tree[u].fail]--;
			if(!d[tree[u].fail])q.push(tree[u].fail);
		}
	}
}
int edpos[maxn];
signed main(){
	ios::sync_with_stdio(0);
	int n;cin>>n;
	for(int i=1;i<=n;i++){
		string s;cin>>s;
		edpos[i]=ACAM::add(s);
	}
	ACAM::build();
	string s;cin>>s;
	ACAM::solve(s);
	for(int i=1;i<=n;i++)cout<<ACAM::tree[edpos[i]].sum<<'\n';
	return 0;
}
```

### SA

注意 $n=1$ 的时候 rk 并不是真实排名。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=3e6+7;
const ll inf=1e15;
int n;
char s[maxn];
int rnk[maxn];
int bkrnk[maxn];
int tot;
vector<int>buc[maxn];
int inv[maxn];
signed main(){
	ios::sync_with_stdio(0);
	string tmp;cin>>tmp;
	n=tmp.size();for(int i=1;i<=n;i++)s[i]=tmp[i-1];
	if(n==1){
		cout<<1<<endl;
		return 0;
	}
	for(int i=1;i<=n;i++)rnk[i]=s[i];
	tot=256;
	for(int t=0;1<<t<n;t++){
		vector<int>tmp;
		for(int i=1;i<=n;i++)bkrnk[i]=rnk[i+(1<<t)];
		for(int i=1;i<=n;i++)buc[bkrnk[i]].push_back(i);
		for(int i=0;i<=tot;i++){
			for(auto x:buc[i])tmp.push_back(x);
		}
		for(int i=0;i<=tot;i++)buc[i].clear();
		for(auto x:tmp)buc[rnk[x]].push_back(x);
		int rk=0;
		for(int i=0;i<=tot;i++){
			int pre=-1;
			for(auto x:buc[i]){
				if(bkrnk[x]!=pre)rnk[x]=++rk;
				else rnk[x]=rk;
				pre=bkrnk[x];
			}
		}
		for(int i=0;i<=tot;i++)buc[i].clear();
		tot=rk;
	}
	for(int i=1;i<=n;i++)inv[rnk[i]]=i;
	for(int i=1;i<=n;i++)cout<<inv[i]<<' ';cout<<endl;
	return 0;
}
```

### 最小表示法

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=2e7+7;
const ll inf=1e15;
int n;
char s[maxn];
bool vis[maxn];
signed main(){
	ios::sync_with_stdio(0);
	cin>>n;
	for(int i=1;i<=n;i++)cin>>s[i];
	for(int i=1;i<=n;i++)s[i+n]=s[i];
	int s1=1,s2=2;
	while(1){
		int l=1;
		while(l<=n&&s[s1+l-1]==s[s2+l-1])l++;
		if(l>n)break;
		if(s[s1+l-1]>s[s2+l-1])swap(s1,s2);
		for(int i=s2;i<=s2+l-1;i++)vis[i]=1;
		while(s2<=n&&(s2==s1||vis[s2]))s2++;
		if(s2>n)break;
	}
	for(int i=1;i<=n;i++)cout<<s[s1+i-1];cout<<endl;
	return 0;
}
```

## 五、线性代数

### 高斯消元

处理小数的时候非常容易爆炸，要注意是拿绝对值最大的那个行过来。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e2+7;
const int inf=1e9;
const ld eps=1e-9;
int n;
ld mat[maxn][maxn];
signed main(){
	ios::sync_with_stdio(0);
    cin>>n;
    for(int i=1;i<=n;i++){
        for(int j=1;j<=n+1;j++)cin>>mat[i][j];
    }
    for(int i=1;i<=n;i++){
        int maxi=i;
        for(int j=i+1;j<=n;j++)if(fabs(mat[j][i])>fabs(mat[maxi][i]))maxi=j;
        if(fabs(mat[maxi][i])<eps){
            cout<<"No Solution\n";
            return 0;
        }
        for(int j=i;j<=n+1;j++)swap(mat[i][j],mat[maxi][j]);
        for(int k=1;k<=n;k++){
            if(k==i)continue;
            ld rt=mat[k][i]/mat[i][i];
            for(int j=i;j<=n+1;j++)mat[k][j]-=rt*mat[i][j];
        }
    }
    cout<<fixed<<setprecision(2);
    for(int i=1;i<=n;i++)cout<<mat[i][n+1]/mat[i][i]<<endl;
	return 0;
}
```

### 行列式

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=6e2+7;
const int inf=1e9;
const ld eps=1e-9;
int n,mod;
ll mat[maxn][maxn];
signed main(){
	ios::sync_with_stdio(0);
    cin>>n>>mod;
    for(int i=1;i<=n;i++){
        for(int j=1;j<=n;j++)cin>>mat[i][j];
    }
    ll ans=1;
    for(int i=1;i<=n;i++){
        for(int j=i+1;j<=n;j++){
            while(mat[i][i]){
                ll d=mat[j][i]/mat[i][i];
                for(int k=1;k<=n;k++)mat[j][k]=(mat[j][k]-mat[i][k]*d%mod+mod)%mod;
                ans=mod-ans;
                swap(mat[i],mat[j]);
            }
            ans=mod-ans;
            swap(mat[i],mat[j]);
        }
    }
    for(int i=1;i<=n;i++)ans=ans*mat[i][i]%mod;
    cout<<ans<<endl;
	return 0;
}
```

## 六、数论

### exgcd

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
const ll inf=1e14;
const int mod=1e9+7;
pair<ll,ll>exgcd(ll a,ll b){
    if(!b)return mkp(1,0);
    auto [_x,_y]=exgcd(b,a%b);
    return mkp(_y,_x-a/b*_y);
}
void solve(){
    ll a,b,c;cin>>a>>b>>c;
    ll g=__gcd(a,b);
    if(c%g){
        cout<<-1<<'\n';
        return;
    }
    a/=g;b/=g;c/=g;
    auto [x,y]=exgcd(a,b);
    x*=c;y*=c;
    ll x1=(x%b+b)%b;if(x1==0)x1+=b;
    ll y1=(c-a*x1)/b;
    ll y2=(y%a+a)%a;if(y2==0)y2+=a;
    ll x2=(c-b*y2)/a;
    if(y1>0){
        cout<<(x2-x1)/b+1<<' '<<x1<<' '<<y2<<' '<<x2<<' '<<y1<<'\n';
    }
    else cout<<x1<<' '<<y2<<'\n';
}
signed main(){
	ios::sync_with_stdio(0);
    int T;cin>>T;
    while(T--)solve();
	return 0;
}
```

### CRT

注意 `__int128`

式子是 $\sum_{i=1}^na_iM_it_i$，其中 $t_i$ 为 $M_i$ 模 $b_i$ 意义下的逆元。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
const ll inf=1e14;
const int mod=1e9+7;
pair<ll,ll>exgcd(ll a,ll b){
    if(!b)return mkp(1,0);
    auto [_x,_y]=exgcd(b,a%b);
    return mkp(_y,_x-a/b*_y);
}
ll get_inv(ll a,ll m){
    pair<ll,ll>sol=exgcd(a,m);
    return (sol.first%m+m)%m;
}
pair<ll,ll>val[maxn];
signed main(){
	ios::sync_with_stdio(0);
    int n;cin>>n;
    for(int i=1;i<=n;i++)cin>>val[i].first>>val[i].second;
    ll ans=0;
    __int128 mul=1;for(int i=1;i<=n;i++)mul=mul*val[i].first;
    for(int i=1;i<=n;i++){
        __int128 M=mul/val[i].first;
        ans=(ans+M*val[i].second%mul*get_inv(M,val[i].first)%mul)%mul;
    }
    cout<<ans<<endl;
	return 0;
}
```

### exCRT

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
const ll inf=1e14;
const int mod=1e9+7;
pair<ll,ll>exgcd(ll a,ll b){
    if(!b)return mkp(1,0);
    auto [_x,_y]=exgcd(b,a%b);
    return mkp(_y,_x-a/b*_y);
}
__int128 gcd(__int128 a,__int128 b){
    return (b==0?a:gcd(b,a%b));
}
struct seq{
    __int128 a,b;
    friend seq operator + (seq s1,seq s2){
        if(s1.a==0||s2.a==0)return (seq){0,0};
        __int128 g=gcd(s1.a,s2.a);
        if((s2.b-s1.b)%g){
            return (seq){0,0};
        }
        __int128 new_b=s2.b-s1.b;new_b/=g;
        pair<__int128,__int128>sol=exgcd(s1.a/g,s2.a/g);
        sol.first*=new_b;
        __int128 new_a=s1.a/g*s2.a;
        return (seq){new_a,((sol.first*s1.a%new_a+new_a)%new_a+s1.b)%new_a};
    }
}sq[maxn];
signed main(){
	ios::sync_with_stdio(0);
    int n;cin>>n;
    for(int i=1;i<=n;i++){
        ll x,y;cin>>x>>y;
        sq[i]=(seq){x,y};
    }
    seq ans=(seq){1,0};
    for(int i=1;i<=n;i++){
        ans=ans+sq[i];
    }
    cout<<(ll)ans.b<<endl;
	return 0;
}
```

### BSGS

注意对分块边界进行审查。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
const ll inf=1e14;
signed main(){
	ios::sync_with_stdio(0);
    ll p,b,n;cin>>p>>b>>n;
    map<ll,int>mp;
    ll B=sqrt(p);
    for(ll j=0,v=n;j<=B;j++,v=v*b%p){
        mp[v]=j;
    }
    ll b_B=1;for(int i=1;i<=B;i++)b_B=b_B*b%p;
    for(ll j=1,v=b_B;j*B<=p;j++,v=v*b_B%p){
        if(mp[v]){
            cout<<j*B-mp[v]<<endl;
            return 0;
        }
    }
    cout<<"no solution";
	return 0;
}
```

### exBSGS

注意对边界条件的特判。以及分块那里往后延要小心。

```cpp
#include<bits/stdc++.h>
#define ll long long
#define mkp make_pair
#define ull unsigned long long
#define mkt make_tuple
#define ld long double
using namespace std;
const int maxn=1e6+7;
const ll inf=1e14;
pair<ll,ll> exgcd(ll a,ll b){
    if(!b)return mkp(1,0);
    auto [_x,_y]=exgcd(b,a%b);
    return mkp(_y,_x-a/b*_y);
}
ll get_inv(ll x,ll mod){
    auto [y,_]=exgcd(x,mod);
    return (y%mod+mod)%mod;
}
ll BSGS(ll p,ll b,ll n){
    map<ll,int>mp;
    ll B=sqrt(p);
    for(ll j=0,v=n;j<=B;j++,v=v*b%p){
        mp[v]=j;
    }
    ll b_B=1;for(int i=1;i<=B;i++)b_B=b_B*b%p;
    for(ll j=1,v=b_B;j*B-B<=p;j++,v=v*b_B%p){
        if(mp[v]){
            return j*B-mp[v];
        }
    }
    return -1;
}
ll exBSGS(ll p,ll b,ll n){
    if(p==1)return 0;
    b%=p;n%=p;
    for(ll i=0,v=1;i<=32;i++,v=v*b%p){
        if(v==n)return i;
    }
    ll mul=1;int cnt=0;
    while(__gcd(p,b)!=1){
        ll g=__gcd(p,b);
        if(n%g)return -1;
        mul=mul*(b/g)%p;
        n/=g;p/=g;
        cnt++;
    }
    mul%=p;
    n=n*get_inv(mul,p)%p;
    ll val=BSGS(p,b,n);
    if(val==-1)return -1;
    return val+cnt;
}
signed main(){
    ll p,b,n;
    while(1){
        scanf("%ld%ld%ld",&b,&p,&n);
        if(p==0)return 0;
        ll ans=exBSGS(p,b,n);
        if(ans==-1)printf("No Solution\n");
        else printf("%ld\n",ans);
    }
	return 0;
}
```
