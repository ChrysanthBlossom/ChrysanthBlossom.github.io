---
title: XCPC 模板
date: 2026-10-31 20:34:13
tags:
  - 模板
categories:
  - CP
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

### 1. inf 种 tarjan

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

### 2.网络流

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

## 三、DS

### 1.莫队

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

由于没有 build，因此 query 时有可能遇到空节点，需知悉。

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
