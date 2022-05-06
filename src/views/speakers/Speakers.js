import OnlyHeader from "components/Headers/OnlyHeader";
import React from "react";
import Moment from 'moment';
// reactstrap components
import {
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Media,
  Pagination,
  PaginationItem,
  PaginationLink,
  Progress,
  Table,
  Container,
  Row,
  Col,
  UncontrolledTooltip,
  Navbar,
  NavLink,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";

//MUI
import { DataGrid } from "@material-ui/data-grid";

import { connect } from "react-redux";
import { setUserLoginDetails } from "features/user/userSlice";
import { LinearProgress, Avatar, Button, Snackbar } from "@material-ui/core";

class Speakers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      speakers: [],
      allErrors : '',
      toggle : false,
      snackbarStatus : false,
      snackBarMessage:'Default Text',
    };
  }
  handleSnackbarChange = () =>{
    this.setState({snackbarStatus: !this.state.snackbarStatus});
  }

  componentDidMount() {
    if (this.state.speakers.length === 0)
      this.fetchSpeakers(
        this.props.rcp_url.proxy_domain +
          this.props.rcp_url.base_wp_url +
          "speakers"
      );
  }

  componentDidUpdate() {}
  
  toggleModal = () => {
    this.setState({toggle: !this.state.toggle});
  }

  fetchSpeakers = async (url) => {
    const queryUrl = new URL(url);
    const params = {
      per_page: 100,
      acf_format: "standard",
    };
    for (let key in params) {
      queryUrl.searchParams.set(key, params[key]);
    }
    const res = await fetch(queryUrl);

    if(res.status != 200){
      this.setState({toggle: true});
      this.setState({allErrors: this.state.allErrors+' '+res.statusText });
    //  alert(res.statusText);
    }


    const data = await res.json();
    this.setState({ speakers: data });
  };

  render() {
    const columns = [
      //   {
      //     field: "id",
      //     headerName: "ID",
      //     width: 90,
      //   },
      {
        field: "name",
        headerName: "Speaker Name",
        width: 340,
        renderCell: (params) => (
          <div className="d-flex align-items-center">
            <Avatar
              className="mr-5"
              alt={params.row?.avatar_alt}
              src={params.row?.avatar}
            />
            <Media>
              <span
                className="mb-0 text-sm font-weight-600"
                style={{ color: "#525f7f" }}
              >
                {params.row?.name}
              </span>
            </Media>
          </div>
        ),
      },
      {
        field: "designation",
        headerName: "Designation",
        width: 180,
      },
      {
        field: "status",
        headerName: "Status",
        width: 180,
      },
      {
        field: "date",
        headerName: "Created Date",
        width: 180,
      },
    ];

    const rows =
      this.state.speakers.length !== 0
        ? this.state.speakers.map((item) => {
            return {
              id: item.id,
              name: item?.title.rendered,
              avatar_alt: item?.acf?.profile_picture?.title,
              avatar: item?.acf?.profile_picture?.url,
              designation: item?.acf?.designation,
              status: item.status,
              date: Moment(item.date).format('DD-MM-YYYY'),//item.date,
            };
          })
        : [];
        
        /*ADDED FOR SNACKBAR */
        const action = (
          <React.Fragment>
            <Button
              size="small"
              aria-label="close"
              color="inherit"
              onClick={this.handleSnackbarChange}
            >
              Close
            </Button>
          </React.Fragment>
        );

    return (
      <>

      <Modal isOpen={this.state.toggle} toggle={this.toggleModal} >
              <ModalHeader>
                  Errors
              </ModalHeader>
              
                <ModalBody>
                  {this.state.allErrors}
                </ModalBody>            
                
              <ModalFooter>
                <Button color="primary" onClick={this.toggleModal} >Dismiss</Button>
              </ModalFooter>
        </Modal>

        <OnlyHeader />  
        <Container className="mt--8" fluid>
          <Row>
            <div className="col">
              <Card className="shadow">
                <CardHeader className="border-0 d-flex justify-content-between pl-3 pr-3">
                  <h3 className="mb-0">Speakers</h3>
                  <Button
                    variant="contained"
                    onClick={
                    
                      () =>{
                        try{
                        this.props.history.push("speakers/create");
                        this.handleSnackbarChange();
                        this.setState({snackBarMessage:"Uploaded Successfully" });
                
                      }catch(e){
                        this.handleSnackbarChange();
                        this.setState({snackBarMessage:e.toString() });
                      }
                      }

                      //  () => this.props.history.push("speakers/create")
                    }
                  >
                    Create
                  </Button>
                </CardHeader>
                <CardBody>
{/* ADDED SNACKBAR */}
                  <Snackbar
                      open={this.state.snackbarStatus}
                      autoHideDuration={4000}
                      onClose={this.handleSnackbarChange}
                      message={this.state.snackBarMessage}
                      action={action}
                      anchorOrigin={{vertical: 'top',horizontal: 'center'}}
                    />
                
                  <DataGrid
                    loading={this.state.speakers.length === 0}
                    components={{
//                      LoadingOverlay: LinearProgress,
                    }}
                    autoHeight
                    rows={rows}
                    columns={columns}
                  />
                </CardBody>
              </Card>
            </div>
          </Row>
        </Container>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    rcp_url: state.rcp_url,
    user: state.user,
  };
};

const mapDispatchToProps = { setUserLoginDetails };

export default connect(mapStateToProps, mapDispatchToProps)(Speakers);
