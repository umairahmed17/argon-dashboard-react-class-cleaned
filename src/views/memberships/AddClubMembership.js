import OnlyHeader from 'components/Headers/OnlyHeader';
import React from 'react';

//@mui
import { Switch } from '@material-ui/core';

// reactstrap components
import { Switch, withStyles } from '@material-ui/core';

import {
	Alert,
	Button,
	Card,
	CardHeader,
	Label,
	Col,
	Input,
	InputGroup,
	Container,
	Row,
	CardBody,
	Form,
	FormFeedback,
	FormGroup,
	Table,
	Progress,
} from 'reactstrap';

import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import Cart from './Cart';

import { connect } from 'react-redux';
import { setUserLoginDetails } from 'features/user/userSlice';
import { setMembershipLevels } from 'features/levels/levelsSlice';
//Stripe
import {
	CardElement,
	ElementsConsumer,
	PaymentElement,
} from '@stripe/react-stripe-js';

//Country Selector
import {
	CountryDropdown,
	RegionDropdown,
	CountryRegionData,
} from 'react-country-region-selector';
import ClubMember from './ClubMember';
import ManualPaymentDropdown from './ManualPaymentDropdown';

class AddClubMembership extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			email: '',
			password: '', // @todo add password validation.
			validate: {
				emailState: '',
			},
			country: '',
			region: '',
			error_message: [],

			error: null,
			openSnackbar: false,
			errorSnackbar: false,
			progress: 0,
			totalProgress: 5,
			discountDetails: {},
			numberOfMembers: 0,
			membersArray: [],
			owner_workplace: {},
		};
		this.memberIndex = 1;
		this.handleChange = this.handleChange.bind(this);
	}

	componentDidMount() {
		if (
			null !== this.props.user.token &&
			this.props.levels?.levels?.length === 0
		) {
			this.fetchMembershipLevels(
				this.props.rcp_url.domain +
					this.props.rcp_url.base_url +
					'levels'
			);
		}
	}

	componentDidUpdate(
		{ user: prevUser },
		{ membership_level: prevMembershipLevel }
	) {
		if (
			null !== this.props.user.token &&
			prevUser.token !== this.props.user.token &&
			this.props.levels?.levels?.length === 0
		) {
			this.fetchMembershipLevels(
				this.props.rcp_url.domain +
					this.props.rcp_url.base_url +
					'levels'
			);
		}

		if (
			undefined !== this.state.membership_level &&
			prevMembershipLevel !== this.state.membership_level
		) {
			const membership = this.props.levels.levels.find(
				el => el.id === parseInt(this.state.membership_level)
			);
			this.setState({ selectedMembership: membership });
		}
	}

	async fetchMembershipLevels(url) {
		const response = await fetch(url, {
			method: 'get',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + this.props.user.token,
			},
		});
		const data = await response.json();
		this.props.setMembershipLevels(data); // state only accepts objects.
	}

	handleChange = event => {
		const { target } = event;
		const value =
			target.type === 'checkbox' ? target.checked : target.value;
		const { name } = target;

		if (name === 'country') {
			let country;
			switch (value) {
				case 'IE':
					country = 'Ireland';
					break;
				case 'GB':
					country = 'UK';
					break;
				case 'US':
					country = 'US';
					break;
			}
			this.setState({
				[name]: country,
			});
			return;
		}
		this.setState({
			[name]: value,
		});
	};

	validateEmail(e) {
		const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/;

		const { validate } = this.state;

		if (emailRegex.test(e.target.value)) {
			validate.emailState = 'has-success';
		} else {
			validate.emailState = 'has-danger';
		}

		this.setState({ validate });
	}

	selectCountry(val) {
		this.setState({ country: val });
	}

	selectRegion(val) {
		this.setState({ region: val });
	}

	updateProgress(val) {
		this.setState({ progress: this.state.progress + val });
	}

	resetProgress() {
		this.setState({ progress: 0 });
	}

	validateDiscount() {
		if (!this.state.selectedMembership) return;

		const code = document.getElementById('discount_code').value;
		//@todo check res.ok on all fetch calls.
		fetch(
			this.props.rcp_url.domain +
				this.props.rcp_url.base_url +
				'discounts/validate',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + this.props.user.token,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					code: code,
					object_id: this.state.selectedMembership.id,
					user_id: this.props.user.id,
				}),
			}
		)
			.then(res => res.json())
			.then(data => {
				console.log(data);
				this.setState({ discountDetails: data });
			})
			.catch(e => console.error(e));
	}

	/**
	 * Handling Stripe Payment
	 *
	 * @param {*} event
	 * @param {integer} membership_id
	 * @param {integer} user_id
	 * @param {strin} subscription_key
	 * @returns object
	 */
	async handlePayment(event, membership_id, user_id, subscription_key) {
		const { stripe, elements } = this.props.stripe;
		if (!stripe || !elements) {
			// Stripe.js has not yet loaded.
			// Make sure to disable form submission until Stripe.js has loaded.
			return;
		}
		const cardElement = elements.getElement('card');
		try {
			/* UPDATE PROGRESS */
			console.log('1');
			this.updateProgress(1);
			const membership = this.props.levels.levels.find(
				el => el.id === parseInt(event.target.membership_level.value)
			);
			console.log('2');
			this.updateProgress(1);
			const formData = new FormData();
			formData.append(
				'code',
				this.state.discountDetails.code
					? this.state.discountDetails.code
					: event.target.discount_code.value
			);
			formData.append('object_id', membership.id);
			formData.append('membership_id', membership_id);
			formData.append('user_id', user_id);
			formData.append('subscription_key', subscription_key);
			const res = await fetch(
				this.props.rcp_url.domain +
					this.props.rcp_url.base_url +
					'payments/payment_intent',
				{
					method: 'post',
					headers: {
						Authorization: 'Bearer ' + this.props.user.token,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(Object.fromEntries(formData)),
				}
			);
			/* UPDATE PROGRESS */
			console.log('3');
			this.updateProgress(1);
			const {
				stripe_client_secret,
				stripe_intent_type,
				payment_id,
			} = await res.json();
			const paymentMethodReq = await stripe.createPaymentMethod({
				type: 'card',
				card: cardElement,
				billing_details: {
					name: `${event.target.first_name.value} ${event.target.last_name.value}`,
					email: event.target.email.value,
					address: {
						line1: event.target.address.value,
						country: this.props.country,
						state: this.props.region,
					},
				},
			});

			if (paymentMethodReq.error) {
				alert(paymentMethodReq.error.message);
				this.resetProgress();
				return;
			}

			const { error, ...transaction } = await stripe.confirmCardPayment(
				stripe_client_secret,
				{
					payment_method: paymentMethodReq.paymentMethod.id,
				}
			);

			if (error) {
				alert(error);
				this.resetProgress();
				return;
			}

			const ret = {
				transaction: transaction.paymentIntent,
				payment_id: payment_id,
			};

			return Promise.resolve(ret);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	/**
	 * Submit the form.
	 */
	async submitForm(event) {
		event.persist();
		event.preventDefault();
		const formData = new FormData(event.target);
		const user_additional_fields = [
			'workplace',
			'reference_club',
			'address',
			'address_two',
			'town',
			'country',
			'county',
			'eircode',
			'phone',
		];
		const user_args = {
			first_name: event.target.first_name.value,
			last_name: event.target.last_name.value,
			user_email: event.target.email.value,
			user_pass: event.target.password.value,
		};
		formData.forEach((val, key) => {
			if (user_additional_fields.includes(key)) user_args[key] = val;
		});

		if (user_args['country']) {
			user_args['country'] = this.state.country;
		}
		this.onSuccessfullCheckout(
			event,
			user_args,
			this.state.selectedMembership,
			event.target.club_name.value
		);
	}

	onSuccessfullCheckout(event, user_args, membership, club_name) {
		this.addCustomer(user_args)
			.then(res => {
				if (res.status !== 200) return Promise.reject(res);
				return res.json();
			})
			.then(data => {
				const { errors } = data;
				if (errors) return Promise.reject(errors);
				return this.addMembership(
					event,
					data.customer_id,
					membership,
					club_name
				);
			})
			.then(res => {
				if (res.status !== 200) return Promise.reject(res);
				return res.json();
			})
			.then(async data_memership => {
				const {
					errors,
					user_id,
					membership_id,
					subscription_key,
				} = data_memership;
				if (errors) return Promise.reject(errors);
				if (this.state.enable_stripe_payment) {
					const {
						transaction,
						payment_id,
					} = await this.handlePayment(
						event,
						membership_id,
						user_id,
						subscription_key
					);

					console.log(transaction);
					return this.updatePayment(payment_id, transaction);
					// return this.addPayment(user_id, membership, transaction);
				}
				if (this.state.enable_manual_payment) {
					return this.addManualPayment(event, user_id, membership);
				}
				return Promise.resolve(data_memership);
			})
			.then(res => {
				if (res.status !== 200) return Promise.reject(res);
				return res.json();
			})
			.then(data_payment => {
				const { errors } = data_payment;
				if (errors) return Promise.reject(errors);
				return data_payment;
			})
			.catch(err => {
				console.error(err);
			});
	}

	addCustomer(user_args) {
		return fetch(
			this.props.rcp_url.domain +
				this.props.rcp_url.base_url +
				'customers/new',
			{
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + this.props.user.token,
				},
				body: JSON.stringify({ user_args: user_args }),
			}
		);
	}

	updatePayment(payment_id, transaction) {
		const args = {
			transaction_id: transaction.id,
			status: transaction.status === 'succeeded' ? 'complete' : 'failed',
		};

		return fetch(
			this.props.rcp_url.domain +
				this.props.rcp_url.base_url +
				'payments/update/' +
				payment_id,
			{
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + this.props.user.token,
				},
				body: JSON.stringify(args),
			}
		);
	}

	addManualPayment(event, user_id, membership) {
		const formData = new FormData(event.target);
		const fields = [
			'transaction_id',
			'gateway',
			'date',
			'transaction_id',
			'gateway_manual',
		];
		const payment_args = {
			subscription: membership.name,
			object_id: membership.id,
			user_id: user_id,
			amount: this.state.discountDetails?.total
				? this.state.discountDetails?.total
				: membership.price,
			status: 'complete',
		};
		formData.forEach((val, key) => {
			if (fields.includes(key)) {
				payment_args[key] = val;
			}
		});
		return fetch(
			this.props.rcp_url.domain +
				this.props.rcp_url.base_url +
				'payments/new',
			{
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + this.props.user.token,
				},
				body: JSON.stringify(payment_args),
			}
		);
	}

	addMembership(event, customer_id, membership, club_name) {
		const formData = new FormData(event.target);
		formData.forEach((val, key) => {
			if (!key.includes('members')) {
				formData.delete(key);
			}
		});
		formData.append('customer_id', customer_id);
		formData.append('object_id', membership.id);
		formData.append('club_name', club_name);
		formData.append('autorenew', event.target.auto_renew.checked);
		formData.append('status', 'active');
		formData.append('paid_by', event.target.paid_by.value);
		formData.append('region', event.target.region.value);
		return fetch(
			this.props.rcp_url.domain +
				this.props.rcp_url.base_url +
				'memberships/new',
			{
				method: 'post',
				headers: {
					Authorization: 'Bearer ' + this.props.user.token,
				},
				body: formData,
			}
		);
	}

	incrementNumberOfMembers = e => {
		e.preventDefault();
		if (this.state.numberOfMembers >= 4) return;
		this.setState({
			numberOfMembers: this.state.numberOfMembers + 1,
			membersArray: [
				...this.state.membersArray,
				<ClubMember
					memberIndex={this.memberIndex}
					key={this.memberIndex}
					handleChange={this.handleChange}
					levels={this.props.levels}
					increment={this.incrementNumberOfMembers}
					decrement={this.decrementNumberOfMembers}
					workplace={this.state.owner_workplace.value}
				/>,
			],
		});
		this.memberIndex = this.memberIndex + 1;
	};
	decrementNumberOfMembers = (e, key) => {
		e.preventDefault();
		if (this.state.numberOfMembers < -1) return;
		this.setState({
			numberOfMembers: this.state.numberOfMembers - 1,
			membersArray: this.state.membersArray.filter(el => el.key != key),
		});
	};
	render() {
		const { email, country, region } = this.state;
		const cardElementOptions = {
			style: { base: {}, invalid: {} },
			hidePostalCode: true,
		}; // @todo for styling card element.

		// const numOfMembers = [];

		// for (var i = 0; i <= this.state.numberOfMembers; i += 1) {
		// 	numOfMembers.push(
		// 		<ClubMember
		// 			memberIndex={i}
		// 			key={i}
		// 			handleChange={this.handleChange}
		// 			increment={this.incrementNumberOfMembers}
		// 			decrement={this.decrementNumberOfMembers}
		// 			workplace={this.state.owner_workplace.value}
		// 		/>
		// 	);
		// }
		return (
			<>
				<OnlyHeader />
				<Container className='mt--8' fluid>
					<Row>
						<div className='col'>
							<Card className='shadow'>
								<CardHeader className='border-0'>
									<h3 className='mb-0'>
										Add Club Membership
									</h3>
								</CardHeader>
								<CardBody>
									{/* PROGRESS BAR */}
									{this.state.progress > 0 && (
										<Progress
											value={
												(this.state.progress /
													this.state.totalProgress) *
												100
											}
										/>
									)}
									<Form onSubmit={this.submitForm.bind(this)}>
										<FormGroup row>
											<Label sm={4}>
												Membership Type
											</Label>
											<Col md={6}>
												<Input
													name='membership_level'
													defaultValue='select'
													type='select'
													onChange={e => {
														this.handleChange(e);
													}}
													required
												>
													<option value='select'>
														Select club membership
														level.
													</option>
													{this.props.levels.levels
														.length > 0 &&
														this.props.levels.levels
															.filter(
																el =>
																	el.level ===
																	3
															)
															.map(
																(item, key) => (
																	<option
																		key={
																			key
																		}
																		value={
																			item.id
																		}
																	>
																		{
																			item.name
																		}
																	</option>
																)
															)}
												</Input>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4}>Club Name</Label>
											<Col md={6}>
												<Input
													id='club_name'
													name='club_name'
													placeholder='Club Name'
													type='text'
													onChange={e => {
														this.handleChange(e);
													}}
													required
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4}>
												Club Description
											</Label>
											<Col md={6}>
												<Input
													id='club_description'
													name='club_description'
													placeholder='Club Description'
													type='textarea'
													onChange={e => {
														this.handleChange(e);
													}}
													required
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4}>First Name</Label>
											<Col md={6}>
												<Input
													id='first_name'
													name='first_name'
													placeholder='First Name'
													type='text'
													onChange={e => {
														this.handleChange(e);
													}}
													required
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4}>Last Name</Label>
											<Col md={6}>
												<Input
													id='last_name'
													name='last_name'
													placeholder='Last Name'
													type='text'
													onChange={e => {
														this.handleChange(e);
													}}
													required
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label for='email' sm={4}>
												Email
											</Label>
											<Col md={6}>
												<Input
													id='email'
													name='email'
													placeholder='Email'
													type='email'
													valid={
														this.state.validate
															.emailState ===
														'has-success'
													}
													invalid={
														this.state.validate
															.emailState ===
														'has-danger'
													}
													value={email}
													onChange={e => {
														this.validateEmail(e);
														this.handleChange(e);
													}}
													required
												/>
												<FormFeedback>
													Please use a valid email
													address.
												</FormFeedback>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label for='password' sm={4}>
												Password
											</Label>
											<Col md={6}>
												<Input
													id='password'
													name='password'
													placeholder='Password'
													type='password'
													required
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='workplace'>
												Workplace
											</Label>
											<Col md={6}>
												<Input
													name='workplace'
													type='text'
													innerRef={el =>
														(this.state.owner_workplace = el)
													}
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='reference_club'>
												Job Title
											</Label>
											<Col md={6}>
												<Input
													name='reference_club'
													type='text'
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='address'>
												Address
											</Label>
											<Col md={6}>
												<Input
													required
													name='address'
													type='text'
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='address_two'>
												Address 2
											</Label>
											<Col md={6}>
												<Input
													required
													name='address_two'
													type='text'
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='town'>
												Town
											</Label>
											<Col md={6}>
												<Input
													required
													name='town'
													type='text'
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='country'>
												Country
											</Label>
											<Col md={6}>
												<CountryDropdown
													className='form-control'
													name='country'
													value={country}
													valueType='short'
													whitelist={[
														'IE',
														'US',
														'GB',
													]}
													onChange={val =>
														this.selectCountry(val)
													}
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='county'>
												County
											</Label>
											<Col md={6}>
												<RegionDropdown
													className='form-control'
													name='county' //"country"
													country={country}
													value={region}
													countryValueType='short'
													onChange={val =>
														this.selectRegion(val)
													}
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='eircode'>
												Eircode
											</Label>
											<Col md={6}>
												<Input
													required
													name='eircode'
													type='text'
												/>
											</Col>
										</FormGroup>
										<FormGroup row>
											<Label sm={4} for='phone'>
												Phone
											</Label>
											<Col md={6}>
												<PhoneInput
													name='phone'
													country='ie'
													enableAreaCodes={['ie']}
													enableSearch
													disableSearchIcon
													inputClass='w-100'
												/>
											</Col>
										</FormGroup>
										{this.props.user.is_admin && (
											<FormGroup row>
												<Label sm={4} for='region'>
													Region
												</Label>
												<Col md={6}>
													<Input
														name='region'
														type='select'
													>
														<option value='NW'>
															NW
														</option>
														<option value='SW'>
															SW
														</option>
														<option value='SE'>
															SE
														</option>
														<option value='NE'>
															NE
														</option>
														<option value='NI'>
															NI
														</option>
														<option value='INT'>
															INT
														</option>
													</Input>
												</Col>
											</FormGroup>
										)}
										<h2>Group Members</h2>
										{this.state.numberOfMembers === 0 && (
											<>
												<p>
													To add members, click on the
													button.
												</p>
												<Button
													onClick={
														this
															.incrementNumberOfMembers
													}
												>
													Add Member
												</Button>
											</>
										)}
										{/* {numOfMembers} */}
										{this.state.membersArray}
										{undefined !==
											this.state.selectedMembership && (
											<Cart
												membership={
													this.state
														.selectedMembership
												}
												discount={
													this.state.discountDetails
												}
											/>
										)}
										<FormGroup row>
											<Label sm={4} for='discount_code'>
												ATPI staff code / Discount Code
											</Label>
											<Col md={6}>
												<InputGroup>
													<Input
														name='discount_code'
														type='text'
														id='discount_code'
													/>
													<Button
														onClick={this.validateDiscount.bind(
															this
														)}
													>
														Apply
													</Button>
												</InputGroup>
											</Col>
										</FormGroup>
										<FormGroup
											check
											row
											className='form-group'
										>
											<Input
												type='checkbox'
												name='consent'
												className={
													this.props.classes.checkbox
												}
												onChange={e =>
													this.setState({
														consent:
															e.target.checked,
													})
												}
											/>
											<Col>
												<Label for='consent' check>
													We are aware of the
													importance of your personal
													information. For more
													information, please read
													about how we keep your data
													protected in our Privacy
													Policy
												</Label>
											</Col>
										</FormGroup>
										<FormGroup
											check
											row
											className='form-group'
										>
											<Input
												type='checkbox'
												name='auto_renew'
												className={
													this.props.classes.checkbox
												}
												onChange={e =>
													this.setState({
														auto_renew:
															e.target.checked,
													})
												}
											/>
											<Col>
												<Label for='auto_renew' check>
													Auto Renew
												</Label>
											</Col>
										</FormGroup>
										{this.props.user.is_admin && (
											<FormGroup row>
												<Label sm={4} for='paid_by'>
													Paid by
												</Label>
												<Col md={6}>
													<Input
														name='paid_by'
														type='select'
													>
														<option value='Individual'>
															Individual
														</option>
														<option value='Club'>
															Club
														</option>
														<option value='College'>
															College
														</option>
														<option value='Honorary'>
															Honorary
														</option>
													</Input>
												</Col>
											</FormGroup>
										)}
										<FormGroup
											row
											disabled={
												this.state.enable_manual_payment
											}
										>
											<Label sm={4} for='payment_stripe'>
												Pay with Credit Card(Stripe).
											</Label>
											<Col md={6}>
												<Switch
													name='payment_stripe'
													disabled={
														this.state
															.enable_manual_payment
													}
													onChange={e => {
														this.setState({
															enable_stripe_payment:
																e.target
																	.checked,
														});
													}}
												/>
											</Col>
										</FormGroup>
										{this.state.selectedMembership
											?.price !== 0 &&
											this.state.enable_stripe_payment ===
												true && (
												<FormGroup row>
													<Col md={12}>
														<CardElement
															options={
																cardElementOptions
															}
														/>
													</Col>
												</FormGroup>
											)}
										<FormGroup
											row
											disabled={
												this.state.enable_stripe_payment
											}
										>
											<Label sm={4} for='payment_manual'>
												Manual Payment
											</Label>
											<Col md={6}>
												<Switch
													name='payment_manual'
													disabled={
														this.state
															.enable_stripe_payment
													}
													onChange={e => {
														this.setState({
															enable_manual_payment:
																e.target
																	.checked,
														});
													}}
												/>
											</Col>
										</FormGroup>
										{this.state.selectedMembership
											?.price !== 0 &&
											this.state.enable_manual_payment ===
												true && (
												<FormGroup tag='fieldset'>
													<Input
														name='gateway'
														value='manual'
														type='hidden'
													/>
													<ManualPaymentDropdown />
													<FormGroup row>
														<Label sm={4}>
															Payment date
														</Label>
														<Col
															className='mt-sm-2 mt-md-0'
															md={6}
														>
															<Input
																id='payment_date'
																name='date'
																placeholder='Payment date'
																type='date'
																onChange={e => {
																	this.handleChange(
																		e
																	);
																}}
																required
															/>
														</Col>
													</FormGroup>
													<FormGroup row>
														<Label sm={4}>
															Payment Reference:
														</Label>
														<Col
															className='mt-sm-2 mt-md-0'
															md={6}
														>
															<Input
																id='transaction_id'
																name='transaction_id'
																placeholder='Payment Reference:'
																type='text'
																onChange={e => {
																	this.handleChange(
																		e
																	);
																}}
																required
															/>
														</Col>
													</FormGroup>
												</FormGroup>
											)}
										<FormGroup check row>
											<Col
												sm={{
													size: 10,
												}}
											>
												<Button>Submit</Button>
											</Col>
										</FormGroup>
									</Form>
								</CardBody>
							</Card>
						</div>
					</Row>

					<Snackbar
						open={this.state.openSnackbar}
						autoHideDuration={4000}
						onClose={this.handleClose}
						action={
							<React.Fragment>
								<Button
									size='small'
									aria-label='close'
									color='inherit'
									onClick={this.handleClose}
								>
									<i
										className='fa fa-plus'
										style={{ transform: 'rotate(-45deg)' }}
									/>
								</Button>
							</React.Fragment>
						}
					>
						<Alert
							onClose={this.handleClose}
							color={
								this.state.errorSnackbar ? 'danger' : 'success'
							}
							style={{ width: '100%' }}
						>
							{this.state.error !== null &&
							this.state.errorSnackbar
								? this.state.error
								: 'User Added'}
						</Alert>
					</Snackbar>
				</Container>
			</>
		);
	}
}

const injectedClubCheckoutForm = props => (
	<ElementsConsumer>
		{(stripe, elements) => (
			<AddClubMembership {...props} stripe={stripe} elements={elements} />
		)}
	</ElementsConsumer>
);

const mapStateToProps = state => {
	return {
		rcp_url: state.rcp_url,
		user: state.user,
		levels: state.levels,
	};
};

const styles = {
	checkbox: {
		width: '1em',
		height: '1em',
		marginTop: '0.25em',
		verticalAlign: 'top',
		backgroundColor: '#fff',
		backgroundRepeat: 'no-repeat',
		backgroundPosition: 'center',
		backgroundSize: 'contain',
		border: '1px solid rgba(0,0,0,.25)',
		'-webkit-print-color-adjust': 'exact',
		colorAdjust: 'exact',
	},
};

const mapDispatchToProps = { setUserLoginDetails, setMembershipLevels };

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(injectedClubCheckoutForm));
