import {Component} from '@angular/core'
import {StateService} from "../../services/state.service";
import {InteractionService} from "../../services/interaction.service";
import {Mechanism} from "../../model/mechanism";
import {LinkInteractor} from "../../interactions/link-interactor";
import {KinematicSolverService} from "../../services/kinematic-solver.service";
import {Joint} from "../../model/joint";
import {CompoundLinkInteractor} from "../../interactions/compound-link-interactor";

interface Tab {
    selected: boolean,
    label: string,
    icon: string
}

// enum contains every kind of graph this panel can open.
export enum GraphType {
  CoMPosition,
  CoMVelocity,
  CoMAcceleration,
  referenceJointPosition,
  referenceJointVelocity,
  referenceJointAcceleration
  // Add more graph types as needed
}

@Component({
    selector: 'app-compound-link-analysis-panel',
    templateUrl: './compound-link-analysis-panel.component.html',
    styleUrls: ['./compound-link-analysis-panel.component.scss'],

})

export class CompoundLinkAnalysisPanelComponent {

  currentGraphType: GraphType | null = null;
  graphTypes = GraphType;
  referenceJoint: Joint = this.getCurrentCompoundLink().getJoints()[0];

  graphExpanded: { [key: string]: boolean } = {
    dataSummary: true,
    graphicalAnalysis: false,
    positionOfJoint: false,
      velocityOfJoint: false,
      accelerationOfJoint: false
  };

  constructor(private stateService: StateService, private interactorService: InteractionService, private kinematicSolverService: KinematicSolverService){
      console.log("joint-analysis-panel.constructor");
  }

  getMechanism(): Mechanism {return this.stateService.getMechanism();}
  getCurrentCompoundLink(){
    let currentCompoundLinkInteractor = this.interactorService.getSelectedObject();
    return (currentCompoundLinkInteractor as CompoundLinkInteractor).getCompoundLink();
  }
  getLinkName(): string {return this.getCurrentCompoundLink().name;}
    getReferenceJoint(){return this.referenceJoint;}
    getReferenceJointName(){return this.getReferenceJoint()?.name;}
    getReferenceJointXCoord(){return this.getReferenceJoint()?.coords.x.toFixed(3) as unknown as number;}
    getReferenceJointYCoord(){return this.getReferenceJoint()?.coords.y.toFixed(3) as unknown as number;}



    // get x coord and y coord return the number of the center of mass
  getCOMXCoord(): number {return this.getCurrentCompoundLink()?.centerOfMass.x.toFixed(3) as unknown as number;}
    getCOMYCoord(): number {return this.getCurrentCompoundLink()?.centerOfMass.y.toFixed(3) as unknown as number;}


  /*
  setJointXCoord(xCoordInput: number): void {this.getMechanism().setXCoord(this.getCurrentLink().id, xCoordInput);}
  setJointYCoord(yCoordInput: number): void {this.getMechanism().setYCoord(this.getCurrentLink().id, yCoordInput);}
   */

  openAnalysisGraph(graphType: GraphType): void {
    this.currentGraphType = graphType;
    if(this.currentGraphType == GraphType.CoMPosition){
      this.addPlaceholderCoMJoint();
    }
    this.getGraphData();
  }

  closeAnalysisGraph() {
    if(this.currentGraphType == GraphType.CoMPosition) {
      this.removePlaceholderCoMJoint();
    }

    this.currentGraphType = null;
  }

  getGraphTypes(){
    // @ts-ignore
    return Object.keys(this.graphTypes).filter(key => !isNaN(Number(this.graphTypes[key]))).map(key => Number(this.graphTypes[key])) as GraphType[];
  }

  getGraphTypeName(graphType: GraphType): string {
    switch (graphType) {
      case GraphType.CoMPosition:
        return 'Center of Mass Position';
      case GraphType.CoMVelocity:
        return 'Center of Mass Velocity';
      case GraphType.CoMAcceleration:
        return 'Center of Mass Acceleration';
      case GraphType.referenceJointPosition:
        return 'Reference Joint Position'
      case GraphType.referenceJointVelocity:
        return 'Reference Joint Velocity'
      case GraphType.referenceJointAcceleration:
        return 'Reference Joint Acceleration'
      // Add more cases as needed
      default:
        return ''; // Handle unknown cases or add a default value
    }
  }

  // create a new joint in the center of mass of the current link
  // use this joint for solving position data
  // basically a sneaky workaround to position solving an actual link (which would be hard)
  addPlaceholderCoMJoint(): void{
    let CoM = this.getCurrentCompoundLink().centerOfMass;
    // DO NOT REMOVE THESE VALUE CHANGES
    // PUTTING THE TRACER POINT PERFECTLY IN LINE BREAKS EVERYTHING
    // THESE ARE NECESSARY TO WORK (FOR SOME REASON)
    CoM.x = CoM.x - 0.00001;
    CoM.y = CoM.y - 0.00001;
    let compoundLinkID = this.getCurrentCompoundLink().id;
    this.getMechanism().addJointToLink(compoundLinkID, CoM);
  }

  // deletes placeholder joint. Should be called immediately after closing graphs, so as
  // to not compromise the mechanism people have made
  removePlaceholderCoMJoint(): void {
    this.getMechanism().removeJoint(this.getPlaceholderCoMJoint().id);
  }

  // function searches through current link to find the placeholder joint:
  // the placeholder joint will always have the highest joint ID, because
  // it is being created directly before this function call
  // (and thus nothing could be higher than it)
  getPlaceholderCoMJoint(): Joint {
    const joints = new Map();

    for (const link of this.getCurrentCompoundLink().links.values()) {
      // Assuming each link has a _joints property
      for (const [jointId, joint] of link._joints.entries()) {
        joints.set(jointId, joint);
      }
    }

    let maxJoint: Joint;
    let maxID = Number.MIN_SAFE_INTEGER;

    for (const [jointID, joint] of joints.entries()) {
      if (jointID > maxID) {
        maxID = jointID;
        maxJoint = joint;
      }
    }

    // @ts-ignore
    return maxJoint;
}

  // calls the positionSolver on current joint and reformats data into a type that chart,js can take
  // see TransformPositionsForChart function in kinematic solver for more detail
  getGraphData() {
    switch(this.currentGraphType) {
      case GraphType.CoMPosition:
        let placeholderCoMJoint = this.getPlaceholderCoMJoint();
        const animationPositions = this.kinematicSolverService.solvePositions();
        let chartData = this.kinematicSolverService.transformPositionsForChart(animationPositions, placeholderCoMJoint);
        return chartData;

      case GraphType.CoMVelocity:
      // do at a later date, bozo TODO

      case GraphType.CoMAcceleration:
      // TODO more bozo behavior


      case GraphType.referenceJointPosition:
        if(this.getReferenceJoint() !== undefined) {
          const animationPositions = this.kinematicSolverService.solvePositions();
          let chartData = this.kinematicSolverService.transformPositionsForChart(animationPositions, this.getReferenceJoint()!);
          return chartData;
        }
        return {
          xData: [],
          yData: [],
          timeLabels: []
        };



      default:
        return {
          xData: [],
          yData: [],
          timeLabels: []
        };
    }
  }

  onReferenceJointSelected(joint: Joint){
    this.referenceJoint = joint;
  }


  // geteLinksForJoint and getConnectedJoints are both used to dynamically
  // view and modify the connected joints in a mechanism. Is sent to a loop of
  // dual input blocks in the HTML, that's created by looping through all of the
  // connected joints
    /*
  getLinksForJoint(): IterableIterator<Link> {return this.getMechanism().getConnectedLinksForJoint(this.getCurrentJoint()).values();}
  getConnectedJoints(): Joint[] {
    const connectedLinks: Link[] = Array.from(this.getLinksForJoint());
    const allJoints: Joint[] = connectedLinks.reduce(
        (accumulator: Joint[], link: Link) => {
          const jointMap: Map<number, Joint> = link.joints;
          const joints: Joint[] = Array.from(jointMap.values());
          return accumulator.concat(joints);
        },
        []
    );
    // console.log(allJoints);
    return allJoints;
  }

     */

}
