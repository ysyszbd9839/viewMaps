define(["exports","./Math-fc8cecf5","./Cartesian2-a8ce88a9","./Transforms-9ac5213c","./EllipsoidTangentPlane-97448adb","./PolylinePipeline-45af48b7"],function(a,L,j,P,E,Q){"use strict";var F=Object.freeze({ROUNDED:0,MITERED:1,BEVELED:2}),U=[new j.Cartesian3,new j.Cartesian3],_=new j.Cartesian3,q=new j.Cartesian3,Y=new j.Cartesian3,Z=new j.Cartesian3,k=new j.Cartesian3,H=new j.Cartesian3,J=new j.Cartesian3,K=new j.Cartesian3,W=new j.Cartesian3,X=new j.Cartesian3,p=new j.Cartesian3,$={},aa=new j.Cartographic;function ea(a,e,r,n){var t=a[0],i=a[1],s=j.Cartesian3.angleBetween(t,i),o=Math.ceil(s/n),l=new Array(o);if(e===r){for(c=0;c<o;c++)l[c]=e;return l.push(r),l}for(var C=(r-e)/o,c=1;c<o;c++){var u=e+c*C;l[c]=u}return l[0]=e,l.push(r),l}var M=new j.Cartesian3,T=new j.Cartesian3;var B=new j.Cartesian3(-1,0,0),z=new P.Matrix4,S=new P.Matrix4,A=new P.Matrix3,b=P.Matrix3.IDENTITY.clone(),D=new j.Cartesian3,O=new P.Cartesian4,N=new j.Cartesian3;function ra(a,e,r,n,t,i,s,o){var l=D,C=O;z=P.Transforms.eastNorthUpToFixedFrame(a,t,z),l=P.Matrix4.multiplyByPointAsVector(z,B,l),l=j.Cartesian3.normalize(l,l);var c,u,y,m,d,f,p,g,w=(c=l,u=e,y=a,m=t,d=new E.EllipsoidTangentPlane(y,m),f=d.projectPointOntoPlane(j.Cartesian3.add(y,c,M),M),p=d.projectPointOntoPlane(j.Cartesian3.add(y,u,T),T),g=j.Cartesian2.angleBetween(f,p),0<=p.x*f.y-p.y*f.x?-g:g);A=P.Matrix3.fromRotationZ(w,A),N.z=i,z=P.Matrix4.multiplyTransformation(z,P.Matrix4.fromRotationTranslation(A,N,S),z);var h=b;h[0]=s;for(var v=0;v<o;v++)for(var x=0;x<r.length;x+=3)C=j.Cartesian3.fromArray(r,x,C),C=P.Matrix3.multiplyByVector(h,C,C),C=P.Matrix4.multiplyByPoint(z,C,C),n.push(C.x,C.y,C.z);return n}var l=new j.Cartesian3;function na(a,e,r,n,t,i,s){for(var o=0;o<a.length;o+=3){n=ra(j.Cartesian3.fromArray(a,o,l),e,r,n,t,i[o/3],s,1)}return n}function ta(a,e){for(var r=a.length,n=new Array(3*r),t=0,i=e.x+e.width/2,s=e.y+e.height/2,o=0;o<r;o++)n[t++]=a[o].x-i,n[t++]=0,n[t++]=a[o].y-s;return n}var g=new P.Quaternion,w=new j.Cartesian3,h=new P.Matrix3;function ia(a,e,r,n,t,i,s,o,l,C){var c,u=j.Cartesian3.angleBetween(j.Cartesian3.subtract(e,a,X),j.Cartesian3.subtract(r,a,p)),y=n===F.BEVELED?0:Math.ceil(u/L.CesiumMath.toRadians(5)),m=t?P.Matrix3.fromQuaternion(P.Quaternion.fromAxisAngle(j.Cartesian3.negate(a,X),u/(y+1),g),h):P.Matrix3.fromQuaternion(P.Quaternion.fromAxisAngle(a,u/(y+1),g),h);if(e=j.Cartesian3.clone(e,w),0<y)for(var d=C?2:1,f=0;f<y;f++)e=P.Matrix3.multiplyByVector(m,e,e),c=j.Cartesian3.subtract(e,a,X),c=j.Cartesian3.normalize(c,c),t||(c=j.Cartesian3.negate(c,c)),s=ra(i.scaleToGeodeticSurface(e,p),c,o,s,i,l,1,d);else c=j.Cartesian3.subtract(e,a,X),c=j.Cartesian3.normalize(c,c),t||(c=j.Cartesian3.negate(c,c)),s=ra(i.scaleToGeodeticSurface(e,p),c,o,s,i,l,1,1),r=j.Cartesian3.clone(r,w),c=j.Cartesian3.subtract(r,a,X),c=j.Cartesian3.normalize(c,c),t||(c=j.Cartesian3.negate(c,c)),s=ra(i.scaleToGeodeticSurface(r,p),c,o,s,i,l,1,1);return s}$.removeDuplicatesFromShape=function(a){for(var e=a.length,r=[],n=e-1,t=0;t<e;n=t++){var i=a[n],s=a[t];j.Cartesian2.equals(i,s)||r.push(s)}return r},$.angleIsGreaterThanPi=function(a,e,r,n){var t=new E.EllipsoidTangentPlane(r,n),i=t.projectPointOntoPlane(j.Cartesian3.add(r,a,M),M),s=t.projectPointOntoPlane(j.Cartesian3.add(r,e,T),T);return 0<=s.x*i.y-s.y*i.x};var sa=new j.Cartesian3,oa=new j.Cartesian3;$.computePositions=function(a,e,r,n,t){var i=n._ellipsoid,s=function(a,e){for(var r=new Array(a.length),n=0;n<a.length;n++){var t=a[n];aa=e.cartesianToCartographic(t,aa),r[n]=aa.height,a[n]=e.scaleToGeodeticSurface(t,t)}return r}(a,i),o=n._granularity,l=n._cornerType,C=(t?function(a,e){var r=a.length,n=new Array(6*r),t=0,i=e.x+e.width/2,s=e.y+e.height/2,o=a[0];n[t++]=o.x-i,n[t++]=0,n[t++]=o.y-s;for(var l=1;l<r;l++){var C=(o=a[l]).x-i,c=o.y-s;n[t++]=C,n[t++]=0,n[t++]=c,n[t++]=C,n[t++]=0,n[t++]=c}return o=a[0],n[t++]=o.x-i,n[t++]=0,n[t++]=o.y-s,n}:ta)(e,r),c=t?ta(e,r):void 0,u=r.height/2,y=r.width/2,m=a.length,d=[],f=t?[]:void 0,p=_,g=q,w=Y,h=Z,v=k,x=H,P=J,E=K,M=W,T=a[0],B=a[1],h=i.geodeticSurfaceNormal(T,h);p=j.Cartesian3.subtract(B,T,p),p=j.Cartesian3.normalize(p,p),E=j.Cartesian3.cross(h,p,E),E=j.Cartesian3.normalize(E,E);var z,S=s[0],A=s[1];t&&(f=ra(T,E,c,f,i,S+u,1,1)),M=j.Cartesian3.clone(T,M),T=B,g=j.Cartesian3.negate(p,g);for(var b=1;b<m-1;b++){var D=t?2:1,B=a[b+1],p=j.Cartesian3.subtract(B,T,p);p=j.Cartesian3.normalize(p,p),w=j.Cartesian3.add(p,g,w),w=j.Cartesian3.normalize(w,w),h=i.geodeticSurfaceNormal(T,h);var O=j.Cartesian3.multiplyByScalar(h,j.Cartesian3.dot(p,h),sa);j.Cartesian3.subtract(p,O,O),j.Cartesian3.normalize(O,O);var N,V,G=j.Cartesian3.multiplyByScalar(h,j.Cartesian3.dot(g,h),oa);j.Cartesian3.subtract(g,G,G),j.Cartesian3.normalize(G,G),!L.CesiumMath.equalsEpsilon(Math.abs(j.Cartesian3.dot(O,G)),1,L.CesiumMath.EPSILON7)?(w=j.Cartesian3.cross(w,h,w),w=j.Cartesian3.cross(h,w,w),w=j.Cartesian3.normalize(w,w),N=1/Math.max(.25,j.Cartesian3.magnitude(j.Cartesian3.cross(w,g,X))),(V=$.angleIsGreaterThanPi(p,g,T,i))?(v=j.Cartesian3.add(T,j.Cartesian3.multiplyByScalar(w,N*y,w),v),x=j.Cartesian3.add(v,j.Cartesian3.multiplyByScalar(E,y,x),x),U[0]=j.Cartesian3.clone(M,U[0]),U[1]=j.Cartesian3.clone(x,U[1]),z=ea(U,S+u,A+u,o),d=na(Q.PolylinePipeline.generateArc({positions:U,granularity:o,ellipsoid:i}),E,C,d,i,z,1),E=j.Cartesian3.cross(h,p,E),E=j.Cartesian3.normalize(E,E),P=j.Cartesian3.add(v,j.Cartesian3.multiplyByScalar(E,y,P),P),l===F.ROUNDED||l===F.BEVELED?ia(v,x,P,l,V,i,d,C,A+u,t):d=ra(T,w=j.Cartesian3.negate(w,w),C,d,i,A+u,N,D)):(v=j.Cartesian3.add(T,j.Cartesian3.multiplyByScalar(w,N*y,w),v),x=j.Cartesian3.add(v,j.Cartesian3.multiplyByScalar(E,-y,x),x),U[0]=j.Cartesian3.clone(M,U[0]),U[1]=j.Cartesian3.clone(x,U[1]),z=ea(U,S+u,A+u,o),d=na(Q.PolylinePipeline.generateArc({positions:U,granularity:o,ellipsoid:i}),E,C,d,i,z,1),E=j.Cartesian3.cross(h,p,E),E=j.Cartesian3.normalize(E,E),P=j.Cartesian3.add(v,j.Cartesian3.multiplyByScalar(E,-y,P),P),l===F.ROUNDED||l===F.BEVELED?ia(v,x,P,l,V,i,d,C,A+u,t):d=ra(T,w,C,d,i,A+u,N,D)),M=j.Cartesian3.clone(P,M),g=j.Cartesian3.negate(p,g)):(d=ra(M,E,C,d,i,S+u,1,1),M=T),S=A,A=s[b+1],T=B}U[0]=j.Cartesian3.clone(M,U[0]),U[1]=j.Cartesian3.clone(T,U[1]),z=ea(U,S+u,A+u,o),d=na(Q.PolylinePipeline.generateArc({positions:U,granularity:o,ellipsoid:i}),E,C,d,i,z,1),t&&(f=ra(T,E,c,f,i,A+u,1,1)),m=d.length;var R=t?m+f.length:m,I=new Float64Array(R);return I.set(d),t&&I.set(f,m),I},a.CornerType=F,a.PolylineVolumeGeometryLibrary=$});
