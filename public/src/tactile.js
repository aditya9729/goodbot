// An explicit analytic contact fixture, NOT a hotel-game contact solver.
// Two opposing prescribed Kelvin–Voigt pads. The object is held at a fixed pose.
// A normalized Gaussian footprint redistributes each pad's force over taxels.
export const TACTILE_CONFIG=Object.freeze({schema:'goodbot.synthetic_pad.v1',source:'analytic_prescribed_contact_fixture',stiffness_N_per_m:800,damping_Ns_per_m:2,pad_width_m:.02,pad_height_m:.02,rows:16,columns:16,max_indentation_m:.004,max_speed_m_per_s:.025,step_s:1/60,world_axes:'x normal to pads, y taxel u, z taxel v',object_pose_fixed:true,solver:'none; prescribed pad motion, unilateral Kelvin-Voigt force and Gaussian footprint',calibrated:false,shear_available:false,slip_available:false});
export function pressureMap(force,{rows=16,columns=16,width=.02,height=.02,u=0,v=0,sigma=.003}={}){
 if(!Number.isFinite(force)||force<0||!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||columns<1||rows>64||columns>64||!Number.isFinite(width)||!Number.isFinite(height)||!(width>0)||!(height>0)||!Number.isFinite(u)||!Number.isFinite(v)||!Number.isFinite(sigma)||!(sigma>0))throw new Error('Invalid tactile map arguments');
 const weights=new Float64Array(rows*columns);let sum=0;for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const dx=((x+.5)/columns-.5)*width-u,dy=((y+.5)/rows-.5)*height-v;const w=Math.exp(-(dx*dx+dy*dy)/(2*sigma*sigma));weights[y*columns+x]=w;sum+=w;}
 if(!(sum>0))throw new Error('Tactile footprint is outside the supported grid');
 const area=width*height/(rows*columns);let cu=0,cv=0;for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const w=weights[y*columns+x]/sum;cu+=w*((x+.5)/columns-.5)*width;cv+=w*((y+.5)/rows-.5)*height;}return {pressure_Pa:Float32Array.from(weights,w=>sum?force*w/sum/area:0),taxel_area_m2:area,rows,columns,center_of_pressure_local_m:force>0?[cu,cv]:null};
}
export class ContactBench {
 constructor(config=TACTILE_CONFIG){this.config={...config};this.time=0;this.indentation=0;this.last=null;this.wasTouching=false;}
 step(dt,target,offset=0){if(!Number.isFinite(dt)||dt<=0||dt>.1||!Number.isFinite(target)||!Number.isFinite(offset))throw new Error('Invalid contact step');const c=this.config,request=Math.min(c.max_indentation_m,Math.max(0,target)),old=this.indentation,max=c.max_speed_m_per_s*dt;this.indentation+=Math.max(-max,Math.min(max,request-old));this.time+=dt;
  const velocity=(this.indentation-old)/dt,touching=this.indentation>0,force=touching?Math.max(0,c.stiffness_N_per_m*this.indentation+c.damping_Ns_per_m*velocity):0;
  const off=Math.min(.004,Math.max(-.004,offset)),map=pressureMap(force,{rows:c.rows,columns:c.columns,width:c.pad_width_m,height:c.pad_height_m,u:off});
  const pads=[-1,1].map((side,i)=>({pad_id:i?'right':'left',position_world_m:[side*.01,0,0],normal_world:[-side,0,0],taxel_u_axis_world:[0,1,0],taxel_v_axis_world:[0,0,1],pressure_grid_convention:'row-major; columns increase world y, rows increase world z; these are surface coordinates, not a full handed sensor frame',force_on_fixed_object_world_N:[-side*force,0,0],normal_force_N:force,pressure_Pa:Array.from(map.pressure_Pa),taxel_area_m2:map.taxel_area_m2,rows:c.rows,columns:c.columns,center_of_pressure_local_m:map.center_of_pressure_local_m,shear_force_N:null,slip:null}));
  this.last={time_s:this.time,requested_indentation_m:request,executed_indentation_m:this.indentation,normal_speed_m_per_s:velocity,contact_phase:touching?(this.wasTouching?'persist':'begin'):(this.wasTouching?'end':'separated'),contact:touching,pads,net_force_on_fixed_object_N:[0,0,0],source:c.source};this.wasTouching=touching;return this.last;
 }
}
