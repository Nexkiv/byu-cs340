
// 1. Explain how this program violates the High-Quality Abstraction principle.
/*
 *  The Employee data type only consists of a start date and an end date. 
 *  The get year sof service function would most likely only be a simple subtraction.
 */

// 2. Explain how you would refactor the code to improve its design.
/*
 *  All the functions in the Retirement calculator don't use the employee value
 *  Why does the getTotalYearsOfService() function take in a start and end date
 *  when the employee data type already has that imformation?
 *  Where is the information for years of total service vs months in last position
 *  because the employee data type only has a start date and an end date?
 *  I think its odd that the retirement calculator is a class that holds onto an
 *  employee rather than some kind of static function collection.
 *  I would rename the employee class to be called something like employee dates
 */

class Employee {
	public employmentStartDate: Date;
	public employmentEndDate: Date;
}

class RetirementCalculator {
	private employee: Employee;

	public constructor(emp: Employee) {
		this.employee = emp;
	}

	public calculateRetirement(payPeriodStart: Date, payPeriodEnd: Date): number { … }

	private getTotalYearsOfService(startDate: Date, endDate: Date): number { … }

	private getMonthsInLastPosition(startDate: Date, endDate: Date): number { … }
	
    ...
}
