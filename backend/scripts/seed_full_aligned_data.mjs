const ADMIN_USER_ID = 'usr-1785138104157'; // Tom Catral

async function main() {
  console.log('--- STARTING DATABASE DATA ALIGNMENT ---');

  // 1. Update Directory Sections with authentic labels, colors, and officeTypes
  const sections = [
    {
      id: 'BLGF',
      label: 'BLGF Regional Office II Personnel',
      officeTypes: ['BLGF'],
      color: 'blue',
    },
    {
      id: 'LGU_STAFF',
      label: 'Provincial & Municipal Treasury Offices (Region II)',
      officeTypes: ['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'],
      color: 'emerald',
    },
    {
      id: 'OTHER_AGENCIES',
      label: 'Partner Regional Agencies (DILG, DBM, COA)',
      officeTypes: ['OTHER_AGENCIES'],
      color: 'amber',
    },
  ];

  const secRes = await fetch('http://localhost:3001/api/directory-sections', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': ADMIN_USER_ID,
    },
    body: JSON.stringify({ sections }),
  });
  console.log('Updated Directory Sections:', secRes.status);

  // 2. Fetch current employees to check who exists
  const empRes = await fetch('http://localhost:3001/api/employees', {
    headers: { 'X-User-Id': ADMIN_USER_ID },
  });
  const currentEmployees = await empRes.json();
  console.log('Current employees before seeding extra contacts:', currentEmployees.length);

  // 3. Authentic Region II Provincial Treasurers
  const provincialTreasurers = [
    {
      fullName: 'Atty. Maria Elena R. Santos',
      position: 'Provincial Treasurer',
      office: 'Provincial Treasury Office - Province of Cagayan',
      officeType: 'PROVINCIAL_TREASURER',
      email: 'pto_cagayan@cagayan.gov.ph',
      contactNo: '(078) 304-1234',
      address: 'Provincial Capitol Compound, Peñablanca / Tuguegarao City, Cagayan',
      active: true,
    },
    {
      fullName: 'Mr. Ferdinand V. Ramirez',
      position: 'Provincial Treasurer',
      office: 'Provincial Treasury Office - Province of Isabela',
      officeType: 'PROVINCIAL_TREASURER',
      email: 'pto_isabela@isabela.gov.ph',
      contactNo: '(078) 323-5678',
      address: 'Provincial Capitol, City of Ilagan, Isabela',
      active: true,
    },
    {
      fullName: 'Ms. Corazon D. Balisi',
      position: 'Provincial Treasurer',
      office: 'Provincial Treasury Office - Province of Nueva Vizcaya',
      officeType: 'PROVINCIAL_TREASURER',
      email: 'pto_nuevavizcaya@nuevavizcaya.gov.ph',
      contactNo: '(078) 321-9876',
      address: 'Provincial Capitol, Bayombong, Nueva Vizcaya',
      active: true,
    },
    {
      fullName: 'Mr. Noel A. Guab',
      position: 'Provincial Treasurer',
      office: 'Provincial Treasury Office - Province of Quirino',
      officeType: 'PROVINCIAL_TREASURER',
      email: 'pto_quirino@quirino.gov.ph',
      contactNo: '(078) 692-5011',
      address: 'Provincial Capitol, Cabarroguis, Quirino',
      active: true,
    },
    {
      fullName: 'Ms. Marites F. Cariaso',
      position: 'Provincial Treasurer',
      office: 'Provincial Treasury Office - Province of Batanes',
      officeType: 'PROVINCIAL_TREASURER',
      email: 'pto_batanes@batanes.gov.ph',
      contactNo: '(078) 533-3456',
      address: 'Provincial Capitol, Basco, Batanes',
      active: true,
    },
  ];

  // 4. Authentic City & Municipal Treasurers
  const municipalTreasurers = [
    {
      fullName: 'Mr. Michael G. Alcantara',
      position: 'City Treasurer',
      office: 'City Treasury Office - Tuguegarao City',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'cto_tuguegarao@tuguegaraocity.gov.ph',
      contactNo: '(078) 844-1290',
      address: 'City Hall, Carig Sur, Tuguegarao City, Cagayan',
      active: true,
    },
    {
      fullName: 'Ms. Glenda M. Paguirigan',
      position: 'City Treasurer',
      office: 'City Treasury Office - City of Ilagan',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'cto_ilagan@cityofilagan.gov.ph',
      contactNo: '(078) 624-2200',
      address: 'City Hall, San Vicente, City of Ilagan, Isabela',
      active: true,
    },
    {
      fullName: 'Mr. Arthur P. Guzman',
      position: 'City Treasurer',
      office: 'City Treasury Office - Cauayan City',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'cto_cauayan@cauayancity.gov.ph',
      contactNo: '(078) 652-3344',
      address: 'City Hall, Tagaran, Cauayan City, Isabela',
      active: true,
    },
    {
      fullName: 'Ms. Jocelyn S. Tiam',
      position: 'City Treasurer',
      office: 'City Treasury Office - Santiago City',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'cto_santiago@santiagocity.gov.ph',
      contactNo: '(078) 305-1122',
      address: 'City Hall, San Andres, Santiago City, Isabela',
      active: true,
    },
    {
      fullName: 'Mr. Eduardo R. Caronan',
      position: 'Municipal Treasurer',
      office: 'Municipal Treasury Office - Aparri',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'mto_aparri@cagayan.gov.ph',
      contactNo: '(078) 888-1234',
      address: 'Municipal Hall, Centro, Aparri, Cagayan',
      active: true,
    },
    {
      fullName: 'Ms. Lorna V. Castillo',
      position: 'Municipal Treasurer',
      office: 'Municipal Treasury Office - Solano',
      officeType: 'MUNICIPAL_TREASURER',
      email: 'mto_solano@nuevavizcaya.gov.ph',
      contactNo: '(078) 326-5566',
      address: 'Municipal Hall, Solano, Nueva Vizcaya',
      active: true,
    },
  ];

  // 5. Partner Regional Agencies
  const otherAgencies = [
    {
      fullName: 'Dir. Jonathan Paul M. Leusen, Jr.',
      position: 'Regional Director',
      office: 'Department of the Interior and Local Government (DILG) - Region II',
      officeType: 'OTHER_AGENCIES',
      email: 'region2@dilg.gov.ph',
      contactNo: '(078) 304-5378',
      address: 'Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
      active: true,
    },
    {
      fullName: 'Dir. Leila S. Magdaong',
      position: 'Regional Director',
      office: 'Department of Budget and Management (DBM) - Regional Office II',
      officeType: 'OTHER_AGENCIES',
      email: 'dbm_ro2@dbm.gov.ph',
      contactNo: '(078) 304-1243',
      address: 'Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
      active: true,
    },
    {
      fullName: 'Atty. Roland A. Rey',
      position: 'Regional Director',
      office: 'Commission on Audit (COA) - Regional Office No. II',
      officeType: 'OTHER_AGENCIES',
      email: 'coaregion2@coa.gov.ph',
      contactNo: '(078) 304-0987',
      address: 'Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
      active: true,
    },
  ];

  const toCreate = [...provincialTreasurers, ...municipalTreasurers, ...otherAgencies];
  for (const emp of toCreate) {
    const alreadyExists = currentEmployees.some(
      (e) => e.fullName.trim().toLowerCase() === emp.fullName.trim().toLowerCase()
    );
    if (!alreadyExists) {
      const res = await fetch('http://localhost:3001/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': ADMIN_USER_ID,
        },
        body: JSON.stringify(emp),
      });
      console.log(`Created ${emp.fullName} (${emp.officeType}):`, res.status);
    } else {
      console.log(`Already exists: ${emp.fullName}`);
    }
  }

  // 6. Update Documents (e.g. BLGFR2-2026-08-OUT-01)
  const docsRes = await fetch('http://localhost:3001/api/documents', {
    headers: { 'X-User-Id': ADMIN_USER_ID },
  });
  const docs = await docsRes.json();
  const outDoc = docs.find((d) => d.trackingNumber === 'BLGFR2-2026-08-OUT-01');
  if (outDoc) {
    await fetch(`http://localhost:3001/api/documents/${outDoc.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': ADMIN_USER_ID,
      },
      body: JSON.stringify({
        routeNo: 'BLGFR2-2026-08-OUT-01',
        direction: 'OUTGOING',
        title: 'BLGF Memorandum on Local Revenue Generation Assessment for FY 2026',
        subject: 'BLGF Memorandum on Local Revenue Generation Assessment for FY 2026',
        category: 'Treasury Circular',
        originatingOffice: 'Bureau of Local Government Finance - Regional Office II',
        destinationOffice: 'Provincial Treasury Office - Province of Cagayan',
        senderName: 'Bureau of Local Government Finance, RO2',
        senderPosition: 'Office of the Regional Director',
        senderAddress: 'Regional Government Center, Carig Sur, Tuguegarao City',
        recipientName: 'Atty. Maria Elena R. Santos',
        recipientPosition: 'Provincial Treasurer',
        recipientOffice: 'Provincial Treasury Office - Province of Cagayan',
        recipientAddress: 'Provincial Capitol Compound, Peñablanca / Tuguegarao City, Cagayan',
        currentStatus: 'COMPLETED',
      }),
    });
    console.log('Updated BLGFR2-2026-08-OUT-01 with complete recipient details');
  }

  // 7. Add Outgoing Document 02 if missing
  const outDoc2 = docs.find((d) => d.trackingNumber === 'BLGFR2-2026-09-OUT-02');
  if (!outDoc2) {
    await fetch('http://localhost:3001/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': ADMIN_USER_ID,
      },
      body: JSON.stringify({
        trackingNumber: 'BLGFR2-2026-09-OUT-02',
        routeNo: 'BLGFR2-2026-09-OUT-02',
        direction: 'OUTGOING',
        title: 'Transmittal of 2026 3rd Quarter Real Property Assessment Guidelines',
        subject: 'Transmittal of 2026 3rd Quarter Real Property Assessment Guidelines',
        category: 'Treasury Circular',
        originatingOffice: 'Bureau of Local Government Finance - Regional Office II',
        destinationOffice: 'City Treasury Office - Tuguegarao City',
        senderName: 'Bureau of Local Government Finance, RO2',
        senderPosition: 'Local Assessment Operations Division',
        senderAddress: 'Regional Government Center, Carig Sur, Tuguegarao City',
        recipientName: 'Mr. Michael G. Alcantara',
        recipientPosition: 'City Treasurer',
        recipientOffice: 'City Treasury Office - Tuguegarao City',
        recipientAddress: 'City Hall, Carig Sur, Tuguegarao City, Cagayan',
        priority: 'ROUTINE',
        currentStatus: 'COMPLETED',
        currentDivision: 'LAOD',
        assignedUser: 'Raymond C. Rosete',
        assignedUserId: 'usr-1785143703735',
        dateReceived: new Date().toISOString(),
        createdBy: 'Tom Catral',
        createdByUserId: ADMIN_USER_ID,
      }),
    });
    console.log('Created BLGFR2-2026-09-OUT-02 with complete recipient details');
  }

  // 8. Add sample envelope dispatch logs
  await fetch('http://localhost:3001/api/envelope-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': ADMIN_USER_ID,
    },
    body: JSON.stringify({
      details: 'Recipient 1: Atty. Maria Elena R. Santos | Office 1: Provincial Treasury Office - Province of Cagayan | Subject: BLGF Memorandum on Local Revenue Generation Assessment for FY 2026 | Printed by: Tom Catral',
      trackingNumber: 'BLGFR2-2026-08-OUT-01',
    }),
  });

  await fetch('http://localhost:3001/api/envelope-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': ADMIN_USER_ID,
    },
    body: JSON.stringify({
      details: 'Recipient 1: Mr. Michael G. Alcantara | Office 1: City Treasury Office - Tuguegarao City | Subject: Transmittal of 2026 3rd Quarter Real Property Assessment Guidelines | Printed by: Tom Catral',
      trackingNumber: 'BLGFR2-2026-09-OUT-02',
    }),
  });
  console.log('Logged sample envelope dispatches');

  // 9. Check final health and MySQL record counts
  await new Promise((r) => setTimeout(r, 1200));
  const healthRes = await fetch('http://localhost:3001/api/health');
  const health = await healthRes.json();
  console.log('\n--- FINAL HEALTH STATUS ---');
  console.log(JSON.stringify(health, null, 2));
}

main().catch(console.error);
